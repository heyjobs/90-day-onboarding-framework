import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getOnboarding from '@salesforce/apex/OnboardingController.getOnboarding';
import getSuccessPlan from '@salesforce/apex/OnboardingController.getSuccessPlan';
import evaluateSla from '@salesforce/apex/OnboardingSlaService.evaluateSla';

export default class OnboardingSidebarStatus extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    accountId;
    onboardingId;
    currentPhase = 'Overview';
    onboarding;
    successPlan;
    slaResults = [];

    @wire(getOnboarding, { accountId: '$accountId' })
    wiredOnboarding({ data }) {
        if (data) {
            this.onboarding = data;
            this.onboardingId = data.Id;
        }
    }

    @wire(getSuccessPlan, { accountId: '$accountId' })
    wiredSuccessPlan({ data }) {
        if (data) {
            this.successPlan = data;
        }
    }

    @wire(evaluateSla, { onboardingId: '$onboardingId' })
    wiredSla({ data }) {
        if (data) {
            this.slaResults = data;
        }
    }

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.visible !== undefined) this.isVisible = message.visible;
            if (message.accountId) {
                this.accountId = message.accountId;
            }
            if (message.currentPhase) {
                this.currentPhase = this.phaseDisplayName(message.currentPhase);
            }
        });
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
    }

    get hasData() {
        return !!this.onboarding;
    }

    get cardTitle() {
        return `Status \u2014 ${this.currentPhase}`;
    }

    get dayBadge() {
        if (!this.onboarding || this.onboarding.Current_Day__c == null) return '\u2014';
        return `Day ${this.onboarding.Current_Day__c}`;
    }

    // ── Status rows ──

    get slaScoreDisplay() {
        // Client-side fallback if field not yet populated
        if (this.onboarding && this.onboarding.SLA_Adherence_Score__c != null) {
            return `${Math.round(this.onboarding.SLA_Adherence_Score__c)}%`;
        }
        if (!this.slaResults || this.slaResults.length === 0) return '\u2014';
        let completed = 0;
        let onTime = 0;
        this.slaResults.forEach(r => {
            if (r.completedDate) {
                completed++;
                if (r.status === 'On-Time') onTime++;
            }
        });
        return completed > 0 ? `${Math.round((onTime / completed) * 100)}%` : '\u2014';
    }

    get slaScoreClass() {
        const text = this.slaScoreDisplay;
        if (text === '\u2014') return 'status-val';
        const val = parseInt(text, 10);
        if (val >= 90) return 'status-val status-green';
        if (val >= 70) return 'status-val status-yellow';
        return 'status-val status-red';
    }

    get healthDisplay() {
        if (!this.onboarding || !this.onboarding.Health_Status_Final__c) return '\u2014';
        return this.onboarding.Health_Status_Final__c;
    }

    get healthClass() {
        const s = this.healthDisplay;
        if (s === 'Green') return 'status-val status-green';
        if (s === 'Yellow') return 'status-val status-yellow';
        if (s === 'Red') return 'status-val status-red';
        return 'status-val';
    }

    get oMinDisplay() {
        if (!this.successPlan || !this.successPlan.O_Min_Status__c) return '\u2014';
        const s = this.successPlan.O_Min_Status__c;
        if (s === 'Validated') return '\u2713 Validated';
        if (s === 'Not Reached') return '\u2716 Not Reached';
        return '\u26A0 ' + s;
    }

    get oMinClass() {
        if (!this.successPlan) return 'status-val';
        const s = this.successPlan.O_Min_Status__c;
        if (s === 'Validated') return 'status-val status-green';
        if (s === 'Not Reached') return 'status-val status-red';
        return 'status-val status-amber';
    }

    get nextDueDisplay() {
        // Find first Due or Late SLA item
        const upcoming = this.slaResults.find(r =>
            r.status === 'Due' || r.status === 'Late' || r.status === 'Critical'
        );
        if (upcoming) {
            const suffix = upcoming.status === 'Late' || upcoming.status === 'Critical'
                ? ' \u2014 OVERDUE'
                : '';
            return `${upcoming.touchpointName}${suffix}`;
        }
        // Check for Not Due
        const notDue = this.slaResults.find(r => r.status === 'Not Due');
        if (notDue) return notDue.touchpointName;
        return 'All complete';
    }

    get nextDueClass() {
        const upcoming = this.slaResults.find(r =>
            r.status === 'Due' || r.status === 'Late' || r.status === 'Critical'
        );
        if (upcoming && (upcoming.status === 'Late' || upcoming.status === 'Critical')) {
            return 'status-val status-red';
        }
        return 'status-val';
    }

    get f2fDisplay() {
        if (!this.onboarding || !this.onboarding.F2F_Date__c) return 'Not scheduled';
        return this.formatDate(this.onboarding.F2F_Date__c);
    }

    get ssDisplay() {
        if (!this.successPlan || !this.successPlan.SS_Engagement_Status__c) return '\u2014';
        return this.successPlan.SS_Engagement_Status__c;
    }

    get ssClass() {
        if (!this.successPlan) return 'status-val';
        const s = this.successPlan.SS_Engagement_Status__c;
        if (s === 'Connected' || s === 'F2F Attended') return 'status-val status-green';
        if (s === 'Not Connected') return 'status-val status-amber';
        return 'status-val';
    }

    get closeOffDisplay() {
        if (!this.onboarding || !this.onboarding.Close_Off_Date__c) return '\u2014';
        return this.formatDate(this.onboarding.Close_Off_Date__c);
    }

    // ── Helpers ──

    phaseDisplayName(step) {
        const map = {
            'overview': 'Overview',
            'pre-phase': 'Pre-Phase',
            'phase-1': 'Phase 1',
            'phase-2': 'Phase 2',
            'phase-3': 'Phase 3',
            'phase-4': 'Phase 4'
        };
        return map[step] || 'Overview';
    }

    formatDate(dateStr) {
        if (!dateStr) return '\u2014';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = d.toLocaleString('en-US', { month: 'short' });
        return `${day} ${mon} ${d.getFullYear()}`;
    }
}
