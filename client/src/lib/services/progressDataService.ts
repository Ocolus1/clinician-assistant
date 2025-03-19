import { apiRequest } from '@/lib/queryClient';
import { Goal, Subgoal, Session, PerformanceAssessment, MilestoneAssessment } from '@shared/schema';
import { ProgressAnalysis } from '@/lib/agent/types';

/**
 * Service for client progress tracking and analysis
 */
export const progressDataService = {
  /**
   * Get comprehensive progress analysis for a client
   */
  async getProgressAnalysis(clientId: number): Promise<ProgressAnalysis> {
    try {
      // Fetch client sessions, goals, and subgoals
      const sessions = await this.fetchSessions(clientId);
      const goals = await this.fetchGoals(clientId);
      
      // Get detailed data for goals with subgoals
      const goalsWithSubgoals = await Promise.all(
        (goals || []).map(async (goal: Goal) => {
          const subgoals = await this.fetchSubgoals(goal.id);
          return { ...goal, subgoals };
        })
      );
      
      // Get session notes with performance assessments
      const sessionNotes = await this.getSessionNotesForClient(clientId, sessions);
      
      // Calculate key metrics
      const attendanceRate = this.calculateAttendanceRate(sessions);
      const goalProgress = this.calculateGoalProgress(goalsWithSubgoals, sessionNotes);
      const overallProgress = this.calculateOverallProgress(goalProgress);
      
      // Filter session status
      const sessionsCompleted = sessions.filter(s => s.status === 'completed' || s.status === 'billed').length;
      const sessionsCancelled = sessions.filter(s => s.status === 'cancelled' || s.status === 'no-show').length;
      
      return {
        overallProgress,
        attendanceRate,
        sessionsCompleted,
        sessionsCancelled,
        goalProgress
      };
    } catch (error) {
      console.error('Error in getProgressAnalysis:', error);
      throw error;
    }
  },

  /**
   * Fetch sessions for a client
   */
  async fetchSessions(clientId: number): Promise<Session[]> {
    try {
      const response = await apiRequest('GET', `/api/sessions/client/${clientId}`);
      return response as unknown as Session[];
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
      const response = await apiRequest('GET', `/api/goals/client/${clientId}`);
      return response as unknown as Goal[];
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
      const response = await apiRequest('GET', `/api/subgoals/goal/${goalId}`);
      return response as unknown as Subgoal[];
    } catch (error) {
      console.error('Error fetching subgoals:', error);
      return [];
    }
  },

  /**
   * Get session notes and assessments for a client
   */
  async getSessionNotesForClient(clientId: number, sessions: Session[] = []): Promise<any[]> {
    const sessionIds = sessions.map(s => s.id);
    const sessionNotes = [];
    
    // For each session, fetch notes and assessments
    for (const sessionId of sessionIds) {
      try {
        // Fetch session note
        const noteResponse = await apiRequest('GET', `/api/session-notes/session/${sessionId}`);
        if (!noteResponse) continue;
        
        const note = noteResponse as any;
        
        // Fetch performance assessments for this note
        const assessmentsResponse = await apiRequest(
          'GET', 
          `/api/performance-assessments/session-note/${note.id}`
        );
        const performanceAssessments = assessmentsResponse as unknown as PerformanceAssessment[];
        
        // Fetch milestone assessments for each performance assessment
        const enhancedAssessments = await Promise.all(
          (performanceAssessments || []).map(async (assessment: PerformanceAssessment) => {
            const milestonesResponse = await apiRequest(
              'GET',
              `/api/milestone-assessments/performance-assessment/${assessment.id}`
            );
            const milestones = milestonesResponse as unknown as MilestoneAssessment[];
            return { ...assessment, milestones };
          })
        );
        
        // Add note with assessments to the result
        sessionNotes.push({
          ...note,
          performanceAssessments: enhancedAssessments
        });
      } catch (error) {
        console.error(`Error fetching data for session ${sessionId}:`, error);
      }
    }
    
    return sessionNotes;
  },

  /**
   * Calculate attendance rate from sessions
   */
  calculateAttendanceRate(sessions: Session[]): number {
    if (sessions.length === 0) return 0;
    
    // Count attended sessions (completed or billed)
    const attendedSessions = sessions.filter(s => 
      s.status === 'completed' || s.status === 'billed'
    ).length;
    
    // Count total scheduled sessions (excluding cancelled)
    const scheduledSessions = sessions.filter(s => 
      s.status !== 'cancelled'
    ).length;
    
    return scheduledSessions > 0 
      ? (attendedSessions / scheduledSessions) * 100 
      : 0;
  },

  /**
   * Calculate progress for each goal based on assessments
   */
  calculateGoalProgress(goalsWithSubgoals: any[], sessionNotes: any[]): any[] {
    return goalsWithSubgoals.map(goal => {
      // Find all performance assessments for this goal
      const goalAssessments = sessionNotes
        .flatMap(note => note.performanceAssessments || [])
        .filter(assessment => assessment.goalId === goal.id);
      
      // Calculate completed milestones
      const subgoals = goal.subgoals || [];
      const subgoalIds = subgoals.map((s: Subgoal) => s.id);
      
      // Get latest milestone assessments for each subgoal
      const latestMilestoneAssessments = new Map();
      
      // Process all milestone assessments to find the latest for each subgoal
      goalAssessments.forEach(assessment => {
        (assessment.milestones || []).forEach((milestone: any) => {
          if (subgoalIds.includes(milestone.milestoneId)) {
            // Check if we have a more recent assessment for this milestone
            const existing = latestMilestoneAssessments.get(milestone.milestoneId);
            if (!existing || new Date(assessment.date) > new Date(existing.date)) {
              latestMilestoneAssessments.set(milestone.milestoneId, {
                ...milestone,
                date: assessment.date
              });
            }
          }
        });
      });
      
      // Count completed milestones (rating >= 4)
      let completedCount = 0;
      latestMilestoneAssessments.forEach(milestone => {
        if (milestone.rating >= 4) {
          completedCount++;
        }
      });
      
      // Calculate progress percentage
      const progress = subgoals.length > 0 
        ? (completedCount / subgoals.length) * 100 
        : 0;
      
      // Prepare milestone data for the response
      const milestones = subgoals.map((subgoal: Subgoal) => {
        const assessment = latestMilestoneAssessments.get(subgoal.id);
        return {
          milestoneId: subgoal.id,
          milestoneTitle: subgoal.title,
          completed: assessment ? assessment.rating >= 4 : false,
          lastRating: assessment ? assessment.rating : undefined
        };
      });
      
      return {
        goalId: goal.id,
        goalTitle: goal.title,
        progress,
        milestones
      };
    });
  },

  /**
   * Calculate overall progress across all goals
   */
  calculateOverallProgress(goalProgress: any[]): number {
    if (goalProgress.length === 0) return 0;
    
    // Calculate weighted average based on the number of milestones
    let totalMilestones = 0;
    let totalCompleted = 0;
    
    goalProgress.forEach(goal => {
      const milestonesCount = goal.milestones.length;
      const completedCount = goal.milestones.filter((m: any) => m.completed).length;
      
      totalMilestones += milestonesCount;
      totalCompleted += completedCount;
    });
    
    return totalMilestones > 0 
      ? (totalCompleted / totalMilestones) * 100 
      : 0;
  }
};