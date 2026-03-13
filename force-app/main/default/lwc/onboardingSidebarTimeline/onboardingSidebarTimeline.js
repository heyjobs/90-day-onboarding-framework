import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getOnboarding from '@salesforce/apex/OnboardingController.getOnboarding';

const TOTAL_DAYS = 90;

export default class OnboardingSidebarTimeline extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    accountId;
    onboarding;

    @wire(getOnboarding, { accountId: '$accountId' })
    wiredOnboarding({ data, error }) {
        if (data) {
            this.onboarding = data;
        } else if (error) {
            this.onboarding = null;
        }
    }

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.visible !== undefined) this.isVisible = message.visible;
            if (message.accountId) {
                this.accountId = message.accountId;
            }
        });
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
    }

    get hasData() {
        return !!this.onboarding;
    }

    get currentDay() {
        if (!this.onboarding || this.onboarding.Current_Day__c == null) return null;
        return Math.max(0, this.onboarding.Current_Day__c);
    }

    get clockLabel() {
        const day = this.currentDay;
        return day != null ? `Day ${day} of ${TOTAL_DAYS}` : 'Not yet started';
    }

    get progressPercent() {
        const day = this.currentDay;
        if (day == null) return 0;
        return Math.min(Math.round((day / TOTAL_DAYS) * 100), 100);
    }

    get progressBarStyle() {
        return `width: ${this.progressPercent}%`;
    }

    get progressColorClass() {
        const pct = this.progressPercent;
        if (pct >= 85) return 'progress-bar-fill progress-bar-fill_warning';
        return 'progress-bar-fill';
    }

    get day0Display() {
        if (!this.onboarding || !this.onboarding.Day0_Date__c) return 'Not set';
        return this.formatDate(this.onboarding.Day0_Date__c);
    }

    get closeOffDisplay() {
        if (!this.onboarding || !this.onboarding.Close_Off_Date__c) return '—';
        return this.formatDate(this.onboarding.Close_Off_Date__c);
    }

    get currentPhase() {
        if (!this.onboarding || !this.onboarding.Current_Phase__c) return 'Pre-Phase';
        return this.onboarding.Current_Phase__c;
    }

    get healthStatus() {
        if (!this.onboarding || !this.onboarding.Health_Status_Final__c) return '—';
        return this.onboarding.Health_Status_Final__c;
    }

    get healthClass() {
        const s = this.healthStatus;
        if (s === 'Green') return 'status-dot status-green';
        if (s === 'Yellow') return 'status-dot status-yellow';
        if (s === 'Red') return 'status-dot status-red';
        return 'status-dot';
    }

    get actionItemsLabel() {
        if (!this.onboarding) return '—';
        const fields = [
            'IHC1_Date__c', 'Intro_Date__c', 'Kickoff_Date__c',
            'Call1_Date__c', 'Call2_Date__c', 'Call3_Date__c',
            'F2F_Date__c', 'Call4_Date__c',
            'Call5_Date__c', 'TL_Gate_Date__c', 'Call6_Date__c'
        ];
        const total = fields.length;
        const done = fields.filter(f => !!this.onboarding[f]).length;
        const pct = Math.round((done / total) * 100);
        return `${pct}% done (${done}/${total})`;
    }

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = d.toLocaleString('en-US', { month: 'short' });
        return `${day} ${mon} ${d.getFullYear()}`;
    }
}
