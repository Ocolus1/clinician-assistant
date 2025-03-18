import { apiRequest } from '@/lib/queryClient';
import { Goal, Subgoal, Session, SessionNote, PerformanceAssessment, MilestoneAssessment } from '@shared/schema';
import { ProgressAnalysis } from '../agent/types';

/**
 * Service for client progress tracking and analysis
 */
export const progressDataService = {
  /**
   * Get comprehensive progress analysis for a client
   */
  async getProgressAnalysis(clientId: number): Promise<ProgressAnalysis> {
    try {
      // Get all sessions for client
      const sessions = await apiRequest('GET', `/api/sessions/client/${clientId}`);
      
      // Get all goals for client
      const goals = await apiRequest('GET', `/api/goals/client/${clientId}`);
      
      // For each goal, get subgoals
      const goalsWithSubgoals = await Promise.all(
        (goals || []).map(async (goal: Goal) => {
          const subgoals = await apiRequest('GET', `/api/subgoals/goal/${goal.id}`);
          return { ...goal, subgoals: subgoals || [] };
        })
      );
      
      // Get session notes for performance assessments
      const sessionNotes = await this.getSessionNotesForClient(clientId, sessions);
      
      // Calculate attendance rate
      const attendanceRate = this.calculateAttendanceRate(sessions || []);
      
      // Calculate goal progress
      const goalProgress = this.calculateGoalProgress(goalsWithSubgoals, sessionNotes);
      
      // Calculate overall progress
      const overallProgress = this.calculateOverallProgress(goalProgress);
      
      return {
        overallProgress,
        attendanceRate,
        sessionsCompleted: sessions ? sessions.filter(s => s.status === 'completed').length : 0,
        sessionsCancelled: sessions ? sessions.filter(s => s.status === 'cancelled').length : 0,
        goalProgress,
      };
    } catch (error) {
      console.error('Error fetching progress analysis:', error);
      throw error;
    }
  },
  
  /**
   * Get session notes and assessments for a client
   */
  async getSessionNotesForClient(clientId: number, sessions: Session[] = []): Promise<any[]> {
    if (!sessions.length) return [];
    
    // Get session notes for each session
    return Promise.all(
      sessions.map(async (session) => {
        try {
          const sessionNote = await apiRequest('GET', `/api/session-notes/session/${session.id}`);
          if (!sessionNote) return null;
          
          // Get performance assessments for the session note
          const performanceAssessments = await apiRequest(
            'GET', 
            `/api/performance-assessments/session-note/${sessionNote.id}`
          );
          
          // For each performance assessment, get milestone assessments
          const assessmentsWithMilestones = await Promise.all(
            (performanceAssessments || []).map(async (assessment: PerformanceAssessment) => {
              const milestoneAssessments = await apiRequest(
                'GET',
                `/api/milestone-assessments/performance-assessment/${assessment.id}`
              );
              return { ...assessment, milestoneAssessments: milestoneAssessments || [] };
            })
          );
          
          return { ...sessionNote, performanceAssessments: assessmentsWithMilestones };
        } catch (error) {
          console.error(`Error fetching session note for session ${session.id}:`, error);
          return null;
        }
      })
    ).then(results => results.filter(Boolean));
  },
  
  /**
   * Calculate attendance rate from sessions
   */
  calculateAttendanceRate(sessions: Session[]): number {
    if (sessions.length === 0) return 0;
    
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    return (completedSessions / sessions.length) * 100;
  },
  
  /**
   * Calculate progress for each goal based on assessments
   */
  calculateGoalProgress(goalsWithSubgoals: any[], sessionNotes: any[]): any[] {
    return goalsWithSubgoals.map(goal => {
      // Extract all performance assessments for this goal
      const assessmentsForGoal = sessionNotes
        .flatMap(note => note.performanceAssessments || [])
        .filter(assessment => assessment.goalId === goal.id);
      
      // Map milestone assessments to subgoals
      const subgoalProgress = goal.subgoals.map((subgoal: Subgoal) => {
        // Find milestone assessments for this subgoal across all session notes
        const milestoneAssessments = assessmentsForGoal
          .flatMap(assessment => assessment.milestoneAssessments || [])
          .filter(ma => ma.milestoneId === subgoal.id);
        
        // Get the most recent rating if any
        const lastRating = milestoneAssessments.length > 0 
          ? milestoneAssessments[milestoneAssessments.length - 1].rating 
          : undefined;
        
        // Determine if completed based on latest rating
        const completed = lastRating !== undefined && lastRating >= 8; // Assuming rating of 8+ means completed
        
        return {
          milestoneId: subgoal.id,
          milestoneTitle: subgoal.title,
          completed,
          lastRating
        };
      });
      
      // Calculate progress percentage for this goal
      const completedSubgoals = subgoalProgress.filter(sg => sg.completed).length;
      const progress = goal.subgoals.length > 0 
        ? (completedSubgoals / goal.subgoals.length) * 100 
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
    if (goalProgress.length === 0) return 0;
    
    const totalProgress = goalProgress.reduce((sum, goal) => sum + goal.progress, 0);
    return totalProgress / goalProgress.length;
  }
};