import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, publish, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getOnboarding from '@salesforce/apex/OnboardingController.getOnboarding';
import getSuccessPlan from '@salesforce/apex/OnboardingController.getSuccessPlan';

// Maps Must-Close item key → touchpoint key in the overview timeline
const NAVIGATE_MAP = {
    gate1: 'ihc1',
    activation: 'kickoff',
    omin: 'call1',
    f2f: 'f2f',
    sp: 'successPlan',
    tlgate: 'tlgate'
};

export default class OnboardingSidebarMustClose extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    accountId;
    onboarding;
    successPlan;

    @wire(getOnboarding, { accountId: '$accountId' })
    wiredOnboarding({ data }) {
        if (data) this.onboarding = data;
    }

    @wire(getSuccessPlan, { accountId: '$accountId' })
    wiredSuccessPlan({ data }) {
        if (data) this.successPlan = data;
    }

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.visible !== undefined) this.isVisible = message.visible;
            if (message.accountId) this.accountId = message.accountId;
        });
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
    }

    get hasData() {
        return !!this.onboarding;
    }

    get items() {
        if (!this.onboarding) return [];
        const onb = this.onboarding;
        const sp = this.successPlan || {};

        const raw = [
            { key: 'gate1', label: 'Gate 1', checked: !!onb.Gate_1_Validated__c, detail: this.gate1Detail },
            { key: 'activation', label: 'Activation Confirmed', checked: !!onb.Activation_Confirmed__c, detail: onb.Activation_Confirmed__c ? 'Done' : 'Pending' },
            { key: 'omin', label: 'O-Min Validated', checked: sp.O_Min_Status__c === 'Validated', detail: sp.O_Min_Status__c || 'Pending' },
            { key: 'f2f', label: 'F2F Completed', checked: !!onb.F2F_Date__c && !!onb.F2F_Format__c && !!sp.Org_Picture__c, detail: this.f2fDetail },
            { key: 'sp', label: 'Success Plan Fields', checked: this.spFieldsComplete, detail: this.spFieldsComplete ? 'Complete' : `${this.spFieldsFilledCount}/4 filled` },
            { key: 'tlgate', label: 'TL Gate', checked: !!onb.TL_Gate_Result__c, detail: onb.TL_Gate_Result__c || 'Not started' }
        ];
        return raw.map(item => ({
            ...item,
            iconClass: item.checked ? 'mc-icon mc-icon-done' : 'mc-icon mc-icon-open',
            labelClass: item.checked ? 'mc-label mc-label-done' : 'mc-label',
            itemClass: item.checked ? 'mc-item' : 'mc-item mc-item-actionable'
        }));
    }

    get gate1Detail() {
        if (!this.onboarding) return 'Pending';
        if (this.onboarding.Gate_1_Validated__c) return '5/5';
        const count = [
            this.onboarding.AE_Handover_Reviewed__c,
            this.onboarding.Customer_Context_Validated__c,
            this.onboarding.Tech_Setup_Path_Confirmed__c,
            this.onboarding.ATS_Case_Opened__c,
            this.onboarding.Ownership_Next_Steps_Clear__c
        ].filter(Boolean).length;
        return `${count}/5`;
    }

    get f2fDetail() {
        if (!this.onboarding) return 'Not scheduled';
        const sp = this.successPlan || {};
        if (this.onboarding.F2F_Date__c && this.onboarding.F2F_Format__c && sp.Org_Picture__c) {
            return 'Complete';
        }
        const parts = [];
        if (!this.onboarding.F2F_Date__c) parts.push('date');
        if (!this.onboarding.F2F_Format__c) parts.push('format');
        if (!sp.Org_Picture__c) parts.push('Org Picture');
        return `Missing: ${parts.join(', ')}`;
    }

    get spFieldsFilledCount() {
        const sp = this.successPlan || {};
        return [
            sp.Customer_Goal__c,
            sp.Health_Status__c,
            sp.Performance_Signal__c,
            sp.Next_Step_Signal__c
        ].filter(Boolean).length;
    }

    get spFieldsComplete() {
        return this.spFieldsFilledCount === 4;
    }

    get completedCount() {
        return this.items.filter(i => i.checked).length;
    }

    get totalCount() {
        return 6;
    }

    get progressLabel() {
        return `${this.completedCount}/${this.totalCount}`;
    }

    get progressBarStyle() {
        return `width:${(this.completedCount / this.totalCount) * 100}%`;
    }

    get allComplete() {
        return this.completedCount === this.totalCount;
    }

    handleItemClick(event) {
        const key = event.currentTarget.dataset.key;
        const target = NAVIGATE_MAP[key];
        if (!target) return;

        publish(this.messageContext, ONBOARDING_VISIBILITY, {
            navigateToTouchpoint: target
        });
    }
}
