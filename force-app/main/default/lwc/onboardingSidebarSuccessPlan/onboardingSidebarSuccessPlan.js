import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getSuccessPlan from '@salesforce/apex/OnboardingController.getSuccessPlan';
import saveSuccessPlan from '@salesforce/apex/OnboardingController.saveSuccessPlan';

const HEALTH_OPTIONS = [
    { label: 'Green', value: 'Green' },
    { label: 'Yellow', value: 'Yellow' },
    { label: 'Red', value: 'Red' }
];

const OMIN_OPTIONS = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Validated', value: 'Validated' },
    { label: 'Not Reached', value: 'Not Reached' }
];

const PERF_OPTIONS = [
    { label: '\u2014', value: '' },
    { label: 'Up', value: 'Up' },
    { label: 'Flat', value: 'Flat' },
    { label: 'Down', value: 'Down' }
];

const NEXT_STEP_OPTIONS = [
    { label: '\u2014 (not yet assessed)', value: '' },
    { label: 'Renewal Likely', value: 'Renewal Likely' },
    { label: 'Conversion Possible', value: 'Conversion Possible' },
    { label: 'Extension', value: 'Extension' },
    { label: 'At Risk', value: 'At Risk' },
    { label: 'Churn', value: 'Churn' }
];

export default class OnboardingSidebarSuccessPlan extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    accountId;
    successPlan;
    _wiredResult;
    _saveTimer;
    isSaving = false;

    healthOptions = HEALTH_OPTIONS;
    oMinOptions = OMIN_OPTIONS;
    perfOptions = PERF_OPTIONS;
    nextStepOptions = NEXT_STEP_OPTIONS;

    @wire(getSuccessPlan, { accountId: '$accountId' })
    wiredSuccessPlan(result) {
        this._wiredResult = result;
        if (result.data) {
            this.successPlan = { ...result.data };
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
        return !!this.successPlan;
    }

    get savingIndicator() {
        return this.isSaving ? 'Saving...' : '';
    }

    // ── Field values ──

    get customerGoal() { return this.successPlan ? this.successPlan.Customer_Goal__c || '' : ''; }
    get healthStatus() { return this.successPlan ? this.successPlan.Health_Status__c || '' : ''; }
    get oMinStatus() { return this.successPlan ? this.successPlan.O_Min_Status__c || '' : ''; }
    get perfSignal() { return this.successPlan ? this.successPlan.Performance_Signal__c || '' : ''; }
    get kpiDraft() { return this.successPlan ? this.successPlan.KPI_Draft__c || '' : ''; }
    get nextStepSignal() { return this.successPlan ? this.successPlan.Next_Step_Signal__c || '' : ''; }
    get nextStepRec() { return this.successPlan ? this.successPlan.Next_Step_Recommendation__c || '' : ''; }
    get budgetTimeline() { return this.successPlan ? this.successPlan.Budget_Timeline__c || '' : ''; }
    get recruitingProcess() { return this.successPlan ? this.successPlan.Recruiting_Process_E2E__c || '' : ''; }
    get internalDynamics() { return this.successPlan ? this.successPlan.Internal_Dynamics__c || '' : ''; }

    // ── Change handler — auto-save with debounce ──

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        const value = event.detail ? event.detail.value : event.target.value;
        if (!field || !this.successPlan) return;

        this.successPlan = { ...this.successPlan, [field]: value };
        this.debounceSave(field, value);
    }

    debounceSave(field, value) {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.saveField(field, value);
        }, 1000);
    }

    async saveField(field, value) {
        if (!this.successPlan || !this.successPlan.Id) return;
        this.isSaving = true;
        try {
            await saveSuccessPlan({
                recordId: this.successPlan.Id,
                fields: { [field]: value }
            });
            await refreshApex(this._wiredResult);
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error saving Success Plan',
                message: error.body ? error.body.message : 'Unknown error',
                variant: 'error'
            }));
        } finally {
            this.isSaving = false;
        }
    }
}
