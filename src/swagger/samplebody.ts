export const swaggerExamples = {
  interviewScheduledEvent: {
    summary: 'Interview scheduled event',
    value: {
      event_name: 'interview_scheduled',
      user_id: 'user_456',
      email: 'rahul.sharma@example.com',
      phone: '9876543210',
      properties: {
        position: 'Backend Developer',
        interview_type: 'Technical',
        location: 'Online',
      },
      timestamp: '2026-08-13T17:10:00.000Z',
    },
  },

  interviewConfig: {
    summary: 'Interview configuration',
    value: {
      event_name: 'interview_scheduled',
      interview_id: 1,
      delay: 30,
      sample_percentage: 90,
      dedup_window: 3600,
    },
  },

  listenery: {
    summary: 'Listenery',
    value: {
      name: 'test1',
      link: 'https://www.listenery.ai/',
    },
  },

  user: {
    summary: 'User',
    value: {
      name: 'Gokhana',
      email: 'abc@gmail.gokhana.com',
    },
  },
};