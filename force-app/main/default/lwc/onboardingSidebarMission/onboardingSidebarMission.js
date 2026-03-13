import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import PREPHASE_MISSION from '@salesforce/label/c.Onboarding_PrePhase_Mission';
import PREPHASE_CUSTOMER_STATE from '@salesforce/label/c.Onboarding_PrePhase_CustomerState';
import PHASE1_MISSION from '@salesforce/label/c.Onboarding_Phase1_Mission';
import PHASE1_CUSTOMER_STATE from '@salesforce/label/c.Onboarding_Phase1_CustomerState';
import PHASE2_MISSION from '@salesforce/label/c.Onboarding_Phase2_Mission';
import PHASE2_CUSTOMER_STATE from '@salesforce/label/c.Onboarding_Phase2_CustomerState';
import PHASE3_MISSION from '@salesforce/label/c.Onboarding_Phase3_Mission';
import PHASE3_CUSTOMER_STATE from '@salesforce/label/c.Onboarding_Phase3_CustomerState';
import PHASE4_MISSION from '@salesforce/label/c.Onboarding_Phase4_Mission';
import PHASE4_CUSTOMER_STATE from '@salesforce/label/c.Onboarding_Phase4_CustomerState';

const PHASE_CONTENT = {
    'overview': {
        mission: 'Navigate through each phase to see the ACM mission and expected customer state.',
        customerState: 'Select a phase above to view details.',
        overview: 'The 90-Day Onboarding Framework guides the Account Manager through five phases — from initial setup through to a confident, independent customer relationship.'
    },
    'pre-phase': {
        missionLabel: PREPHASE_MISSION,
        customerStateLabel: PREPHASE_CUSTOMER_STATE,
        overview: 'The Pre-Phase begins at contract signature and ends at Day 0. During this time, the ACM establishes first contact, ensures all operational setup is underway, and prepares for the kickoff call.'
    },
    'phase-1': {
        missionLabel: PHASE1_MISSION,
        customerStateLabel: PHASE1_CUSTOMER_STATE,
        overview: 'Phase 1 covers Days 1–14. The ACM delivers the Kickoff Call, confirms product activation, and sets the foundation for a successful onboarding journey.'
    },
    'phase-2': {
        missionLabel: PHASE2_MISSION,
        customerStateLabel: PHASE2_CUSTOMER_STATE,
        overview: 'Phase 2 covers Days 15–30. The ACM validates O-Min, deepens the customer relationship, begins Senior Stakeholder outreach, and schedules the F2F meeting.'
    },
    'phase-3': {
        missionLabel: PHASE3_MISSION,
        customerStateLabel: PHASE3_CUSTOMER_STATE,
        overview: 'Phase 3 covers Days 31–74. The ACM conducts the F2F meeting, establishes KPIs, and ensures the customer is performing and on track for a successful close-off.'
    },
    'phase-4': {
        missionLabel: PHASE4_MISSION,
        customerStateLabel: PHASE4_CUSTOMER_STATE,
        overview: 'Phase 4 covers Days 75–90. The ACM completes the 70-Day Self-Check, TL Gate review, and final 90-Day Review to ensure a clean transition to ongoing account management.'
    }
};

export default class OnboardingSidebarMission extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    currentPhase = 'overview';

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.visible !== undefined) this.isVisible = message.visible;
            if (message.currentPhase) {
                this.currentPhase = message.currentPhase;
            }
        });
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
    }

    get phaseContent() {
        return PHASE_CONTENT[this.currentPhase] || PHASE_CONTENT['overview'];
    }

    get missionText() {
        const content = this.phaseContent;
        return content.missionLabel || content.mission || '';
    }

    get customerStateText() {
        const content = this.phaseContent;
        return content.customerStateLabel || content.customerState || '';
    }

    get overviewText() {
        return this.phaseContent.overview || '';
    }

    get isOverviewPhase() {
        return this.currentPhase === 'overview';
    }
}
