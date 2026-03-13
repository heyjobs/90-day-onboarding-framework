export const MOCK_RESOURCES = [
    { id: '1', label: 'Intro Call Guidelines', url: 'https://confluence.example.com/intro-call', icon: 'utility:knowledge_base' },
    { id: '2', label: 'Intro Mail Template', url: 'https://confluence.example.com/intro-mail', icon: 'utility:email' },
    { id: '3', label: 'SF Handover Task', url: '/lightning/r/Task/00T000000000001/view', icon: 'utility:salesforce1' },
    { id: '4', label: 'Kickoff Scheduling Guidelines', url: 'https://confluence.example.com/kickoff', icon: 'utility:event' }
];

export const MOCK_DAY0_LOGIC = [
    { id: '1', product: 'HIRE (no ATS)', trigger: 'BE Case closure ≈ 2h after Closed Won' },
    { id: '2', product: 'HIRE + ATS', trigger: 'O-Team setup complete' },
    { id: '3', product: 'REACH', trigger: 'Campaign Approval / Go-Live' }
];
