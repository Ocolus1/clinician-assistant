import { ProgressAnalysis } from '@/lib/agent/types';
import { Goal, Session, PerformanceAssessment, Subgoal } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

/**
 * Service for client progress tracking and analysis
 */
export const progressDataService = {
  /**
   * Get comprehensive progress analysis for a client
   */
  async getProgressAnalysis(clientId: number): Promise<ProgressAnalysis> {
    try {
      // Get client data
      const [sessions, goals] = await Promise.all([
        this.fetchSessions(clientId),
        this.fetchGoals(clientId)
      ]);
      
      // Get subgoals for each goal
      const goalsWithSubgoals = await Promise.all(
        (goals || []).map(async (goal: Goal) => {
          const subgoals = await this.fetchSubgoals(goal.id);
          return { ...goal, subgoals };
        })
      );
      
      // Get session notes and assessments
      const sessionNotes = await this.getSessionNotesForClient(clientId, sessions);
      
      // Calculate attendance rate
      const attendanceRate = this.calculateAttendanceRate(sessions);
      
      // Count completed and cancelled sessions
      const sessionsCompleted = sessions.filter(s => s.status === 'completed' || s.status === 'billed').length;
      const sessionsCancelled = sessions.filter(s => s.status === 'cancelled').length;
      
      // Calculate progress for each goal
      const goalProgress = this.calculateGoalProgress(goalsWithSubgoals, sessionNotes);
      
      // Calculate overall progress
      const overallProgress = this.calculateOverallProgress(goalProgress);
      
      return {
        overallProgress,
        attendanceRate,
        sessionsCompleted,
        sessionsCancelled,
        goalProgress
      };
    } catch (error) {
      console.error('Error analyzing progress data:', error);
      throw new Error('Failed to analyze progress data');
    }
  },
  
  /**
   * Fetch sessions for a client
   */
  async fetchSessions(clientId: number): Promise<Session[]> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/sessions`);
      return response as Session[];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },
  
  /**
   * Fetch goals for a client
   */
  async fetchGoals(clientId: number): Promise<Goal[]> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/goals`);
      return response as Goal[];
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  },
  
  /**
   * Fetch subgoals for a goal
   */
  async fetchSubgoals(goalId: number): Promise<Subgoal[]> {
    try {
      const response = await apiRequest('GET', `/api/goals/${goalId}/subgoals`);
      return response as Subgoal[];
    } catch (error) {
      console.error('Error fetching subgoals:', error);
      return [];
    }
  },
  
  /**
   * Get session notes and assessments for a client
   */
  async getSessionNotesForClient(clientId: number, sessions: Session[] = []): Promise<any[]> {
    try {
      // For each session, get session notes and performance assessments
      const sessionIds = sessions.map(s => s.id);
      
      // If no sessions, return empty array
      if (sessionIds.length === 0) {
        return [];
      }
      
      // Fetch all session notes for these sessions
      const sessionNotesPromises = sessionIds.map(async (sessionId) => {
        try {
          const sessionNote = await apiRequest('GET', `/api/sessions/${sessionId}/notes`);
          
          if (!sessionNote) {
            return null;
          }
          
          // Fetch performance assessments for this session note
          const performanceAssessments = await apiRequest('GET', `/api/session-notes/${sessionNote.id}/performance-assessments`);
          
          // For each performance assessment, get milestone assessments
          const assessmentsWithMilestones = await Promise.all(
            (performanceAssessments || []).map(async (assessment: PerformanceAssessment) => {
              const milestoneAssessments = await apiRequest('GET', `/api/performance-assessments/${assessment.id}/milestone-assessments`);
              return {
                ...assessment,
                milestoneAssessments
              };
            })
          );
          
          return {
            ...sessionNote,
            performanceAssessments: assessmentsWithMilestones
          };
        } catch (error) {
          console.error(`Error fetching notes for session ${sessionId}:`, error);
          return null;
        }
      });
      
      const sessionNotes = await Promise.all(sessionNotesPromises);
      return sessionNotes.filter(note => note !== null);
    } catch (error) {
      console.error('Error fetching session notes:', error);
      return [];
    }
  },
  
  /**
   * Calculate attendance rate from sessions
   */
  calculateAttendanceRate(sessions: Session[]): number {
    if (sessions.length === 0) {
      return 0;
    }
    
    const completedSessions = sessions.filter(s => 
      s.status === 'completed' || s.status === 'billed'
    ).length;
    
    const cancelledSessions = sessions.filter(s => 
      s.status === 'cancelled'
    ).length;
    
    const scheduledSessions = completedSessions + cancelledSessions;
    
    if (scheduledSessions === 0) {
      return 0;
    }
    
    return (completedSessions / scheduledSessions) * 100;
  },
  
  /**
   * Calculate progress for each goal based on assessments
   */
  calculateGoalProgress(goalsWithSubgoals: any[], sessionNotes: any[]): any[] {
    // If no goals or session notes, return empty array
    if (goalsWithSubgoals.length === 0 || sessionNotes.length === 0) {
      return goalsWithSubgoals.map(goal => ({
        goalId: goal.id,
        goalTitle: goal.title,
        progress: 0,
        milestones: (goal.subgoals || []).map((subgoal: Subgoal) => ({
          milestoneId: subgoal.id,
          milestoneTitle: subgoal.title,
          completed: false
        }))
      }));
    }
    
    // For each goal, calculate progress based on the assessments
    return goalsWithSubgoals.map(goal => {
      // Find subgoals for this goal
      const subgoals = goal.subgoals || [];
      
      // Calculate progress for each subgoal
      const subgoalProgress = subgoals.map((subgoal: Subgoal) => {
        // Find assessments for this subgoal across all session notes
        const assessments = sessionNotes.flatMap(note => 
          (note.performanceAssessments || []).flatMap((assessment: any) => 
            (assessment.milestoneAssessments || []).filter((m: any) => 
              m.subgoalId === subgoal.id
            )
          )
        );
        
        // Calculate progress for this subgoal based on assessments
        const lastAssessment = assessments.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        // Completed if last rating is >= 4 out of 5, or if marked as completed
        const completed = (lastAssessment?.rating >= 4) || subgoal.status === 'complete';
        
        return {
          milestoneId: subgoal.id,
          milestoneTitle: subgoal.title,
          completed,
          lastRating: lastAssessment?.rating
        };
      });
      
      // Calculate overall progress for this goal (percentage of completed subgoals)
      const completedSubgoals = subgoalProgress.filter(s => s.completed).length;
      const progress = subgoals.length > 0 
        ? (completedSubgoals / subgoals.length) * 100
        : 0;
      
      return {
        goalId: goal.id,
        goalTitle: goal.title,
        progress,
        milestones: subgoalProgress
      };
    });
  },
  
  /**
   * Calculate overall progress across all goals
   */
  calculateOverallProgress(goalProgress: any[]): number {
    if (goalProgress.length === 0) {
      return 0;
    }
    
    // Calculate average progress across all goals
    const totalProgress = goalProgress.reduce((sum, goal) => sum + goal.progress, 0);
    return totalProgress / goalProgress.length;
  }
};