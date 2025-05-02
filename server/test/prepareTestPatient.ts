// Script to prepare a test patient with completed onboarding status and test data
import { db } from '../db/index.js';
import { 
  patients, 
  goals, 
  subgoals, 
  goalAssessments, 
  milestoneAssessments,
  sessions
} from '../../shared/schema.ts';
import { eq, and, like } from 'drizzle-orm';

async function prepareTestPatient() {
  try {
    console.log('Preparing test patient for report generation testing...');
    
    // 1. Update Radwan-765193's onboarding status to "completed"
    const patientId = 765193; // Extracted from the hyphenated identifier
    const patientName = 'Radwan-765193';
    
    // First, check if the patient exists
    const existingPatient = await db.select().from(patients).where(eq(patients.id, patientId));
    
    if (existingPatient.length === 0) {
      console.log(`Patient with ID ${patientId} not found. Creating a new test patient...`);
      
      // Create a new test patient
      const newPatient = await db.insert(patients).values({
        id: patientId,
        name: patientName,
        originalName: 'Radwan',
        uniqueIdentifier: '765193',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Male',
        preferredLanguage: 'English',
        contactEmail: 'test@example.com',
        contactPhone: '123-456-7890',
        onboardingStatus: 'completed',
        ndisFunds: 10000
      }).returning();
      
      console.log('Created new test patient:', newPatient);
    } else {
      // Update the existing patient's onboarding status
      await db.update(patients)
        .set({ onboardingStatus: 'completed' })
        .where(eq(patients.id, patientId));
      
      console.log(`Updated patient ${patientId}'s onboarding status to "completed"`);
    }
    
    // 2. Create test goals for the patient
    const existingGoals = await db.select().from(goals).where(eq(goals.patientId, patientId));
    
    if (existingGoals.length === 0) {
      console.log('Creating test goals for the patient...');
      
      // Create communication goal
      const communicationGoal = await db.insert(goals).values({
        patientId: patientId,
        title: 'Improve Communication Skills',
        description: 'Work on verbal and non-verbal communication skills',
        importanceLevel: 'high',
        status: 'in_progress'
      }).returning();
      
      // Create mobility goal
      const mobilityGoal = await db.insert(goals).values({
        patientId: patientId,
        title: 'Enhance Mobility',
        description: 'Improve physical mobility and independence',
        importanceLevel: 'medium',
        status: 'in_progress'
      }).returning();
      
      // Create social goal
      const socialGoal = await db.insert(goals).values({
        patientId: patientId,
        title: 'Develop Social Skills',
        description: 'Build confidence in social interactions',
        importanceLevel: 'high',
        status: 'in_progress'
      }).returning();
      
      console.log('Created test goals:', [communicationGoal, mobilityGoal, socialGoal]);
      
      // 3. Create milestones for each goal
      if (communicationGoal.length > 0) {
        const commGoalId = communicationGoal[0].id;
        
        // Create milestones for communication goal
        const commMilestones = await db.insert(subgoals).values([
          {
            goalId: commGoalId,
            title: 'Initiate conversations',
            description: 'Learn to start conversations with peers',
            status: 'completed'
          },
          {
            goalId: commGoalId,
            title: 'Maintain eye contact',
            description: 'Practice maintaining appropriate eye contact during conversations',
            status: 'in_progress'
          },
          {
            goalId: commGoalId,
            title: 'Use clear speech',
            description: 'Work on articulation and pronunciation',
            status: 'not_started'
          }
        ]).returning();
        
        console.log('Created communication milestones:', commMilestones);
        
        // Create milestone assessments
        await db.insert(milestoneAssessments).values([
          {
            goalId: commGoalId,
            milestoneId: commMilestones[0].id,
            status: 'completed',
            notes: 'Successfully initiates conversations with peers'
          },
          {
            goalId: commGoalId,
            milestoneId: commMilestones[1].id,
            status: 'in_progress',
            notes: 'Making progress with eye contact but still needs prompting'
          }
        ]);
        
        // Create goal assessments
        await db.insert(goalAssessments).values([
          {
            goalId: commGoalId,
            assessmentDate: new Date('2025-04-01'),
            rating: 3,
            notes: 'Making steady progress on communication skills'
          },
          {
            goalId: commGoalId,
            assessmentDate: new Date('2025-04-15'),
            rating: 4,
            notes: 'Significant improvement in initiating conversations'
          }
        ]);
      }
      
      if (mobilityGoal.length > 0) {
        const mobGoalId = mobilityGoal[0].id;
        
        // Create milestones for mobility goal
        const mobMilestones = await db.insert(subgoals).values([
          {
            goalId: mobGoalId,
            title: 'Walk independently',
            description: 'Walk without assistance for 100 meters',
            status: 'completed'
          },
          {
            goalId: mobGoalId,
            title: 'Climb stairs',
            description: 'Climb a flight of stairs with minimal assistance',
            status: 'in_progress'
          }
        ]).returning();
        
        console.log('Created mobility milestones:', mobMilestones);
        
        // Create milestone assessments
        await db.insert(milestoneAssessments).values([
          {
            goalId: mobGoalId,
            milestoneId: mobMilestones[0].id,
            status: 'completed',
            notes: 'Can now walk independently for over 100 meters'
          },
          {
            goalId: mobGoalId,
            milestoneId: mobMilestones[1].id,
            status: 'in_progress',
            notes: 'Needs minimal assistance with stairs'
          }
        ]);
        
        // Create goal assessments
        await db.insert(goalAssessments).values([
          {
            goalId: mobGoalId,
            assessmentDate: new Date('2025-04-05'),
            rating: 3,
            notes: 'Making good progress on mobility'
          },
          {
            goalId: mobGoalId,
            assessmentDate: new Date('2025-04-20'),
            rating: 4,
            notes: 'Significant improvement in walking independently'
          }
        ]);
      }
      
      if (socialGoal.length > 0) {
        const socGoalId = socialGoal[0].id;
        
        // Create milestones for social goal
        const socMilestones = await db.insert(subgoals).values([
          {
            goalId: socGoalId,
            title: 'Participate in group activities',
            description: 'Join and participate in group activities',
            status: 'completed'
          },
          {
            goalId: socGoalId,
            title: 'Make friends',
            description: 'Develop at least two friendships',
            status: 'in_progress'
          }
        ]).returning();
        
        console.log('Created social milestones:', socMilestones);
        
        // Create milestone assessments
        await db.insert(milestoneAssessments).values([
          {
            goalId: socGoalId,
            milestoneId: socMilestones[0].id,
            status: 'completed',
            notes: 'Actively participates in group activities'
          },
          {
            goalId: socGoalId,
            milestoneId: socMilestones[1].id,
            status: 'in_progress',
            notes: 'Has made one friend, working on developing more relationships'
          }
        ]);
        
        // Create goal assessments
        await db.insert(goalAssessments).values([
          {
            goalId: socGoalId,
            assessmentDate: new Date('2025-04-10'),
            rating: 3,
            notes: 'Making progress on social skills'
          },
          {
            goalId: socGoalId,
            assessmentDate: new Date('2025-04-25'),
            rating: 4,
            notes: 'Significant improvement in group participation'
          }
        ]);
      }
    } else {
      console.log(`Patient already has ${existingGoals.length} goals. Skipping goal creation.`);
    }
    
    // 4. Create sessions for the patient
    const existingSessions = await db.select().from(sessions).where(eq(sessions.patientId, patientId));
    
    if (existingSessions.length === 0) {
      console.log('Creating test sessions for the patient...');
      
      // Create sessions
      await db.insert(sessions).values([
        {
          patientId: patientId,
          sessionDate: new Date('2025-04-05'),
          duration: 60,
          notes: 'Worked on communication skills. Made progress with initiating conversations.',
          attendees: 'Patient, Therapist, Caregiver'
        },
        {
          patientId: patientId,
          sessionDate: new Date('2025-04-12'),
          duration: 45,
          notes: 'Focused on mobility exercises. Practiced walking and climbing stairs.',
          attendees: 'Patient, Therapist'
        },
        {
          patientId: patientId,
          sessionDate: new Date('2025-04-19'),
          duration: 60,
          notes: 'Social skills development. Participated in group activity with peers.',
          attendees: 'Patient, Therapist, Group'
        },
        {
          patientId: patientId,
          sessionDate: new Date('2025-04-26'),
          duration: 60,
          notes: 'Comprehensive session covering all goals. Good progress on communication goal.',
          attendees: 'Patient, Therapist, Caregiver'
        }
      ]);
      
      console.log('Created test sessions for the patient');
    } else {
      console.log(`Patient already has ${existingSessions.length} sessions. Skipping session creation.`);
    }
    
    // 5. Verify the patient data
    const updatedPatient = await db.select().from(patients).where(eq(patients.id, patientId));
    console.log('Updated patient data:', updatedPatient);
    
    const patientGoals = await db.select().from(goals).where(eq(goals.patientId, patientId));
    console.log(`Patient has ${patientGoals.length} goals`);
    
    let totalMilestones = 0;
    let totalAssessments = 0;
    
    for (const goal of patientGoals) {
      const milestones = await db.select().from(subgoals).where(eq(subgoals.goalId, goal.id));
      totalMilestones += milestones.length;
      
      const assessments = await db.select().from(goalAssessments).where(eq(goalAssessments.goalId, goal.id));
      totalAssessments += assessments.length;
    }
    
    console.log(`Patient has ${totalMilestones} milestones and ${totalAssessments} assessments`);
    
    const patientSessions = await db.select().from(sessions).where(eq(sessions.patientId, patientId));
    console.log(`Patient has ${patientSessions.length} sessions`);
    
    console.log('Test patient preparation complete!');
    console.log(`Use patient ID ${patientId} or name ${patientName} for testing.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error preparing test patient:', error);
    process.exit(1);
  }
}

prepareTestPatient();
