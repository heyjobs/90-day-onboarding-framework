import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getOnboarding from '@salesforce/apex/OnboardingController.getOnboarding';
import getSuccessPlan from '@salesforce/apex/OnboardingController.getSuccessPlan';
import saveOnboarding from '@salesforce/apex/OnboardingController.saveOnboarding';
import saveSuccessPlan from '@salesforce/apex/OnboardingController.saveSuccessPlan';

const ATS_SETUP_PATH_OPTIONS = [
    { label: '-- Select --', value: '' },
    { label: 'Standard Integration', value: 'Standard Integration' },
    { label: 'Custom Integration', value: 'Custom Integration' },
    { label: 'No ATS', value: 'No ATS' }
];

const ATS_ETA_OPTIONS = [
    { label: '-- Select --', value: '' },
    { label: '<1 Week', value: '<1 Week' },
    { label: '1-2 Weeks', value: '1-2 Weeks' },
    { label: '2-4 Weeks', value: '2-4 Weeks' },
    { label: '>4 Weeks', value: '>4 Weeks' }
];

const EARLY_GOLIVE_OPTIONS = [
    { label: '-- Not relevant / Standard --', value: 'Not Applicable - Standard' },
    { label: 'Early Go-Live - Customer Request', value: 'Early Go-Live - Customer Request' }
];

export default class OnboardingPrePhase extends LightningElement {
    @api recordId;

    onboarding;
    successPlan;
    error;
    _wiredOnb;
    _wiredSp;

    // Saving state
    _saveTimeout;
    isSaving = false;

    atsSetupPathOptions = ATS_SETUP_PATH_OPTIONS;
    atsEtaOptions = ATS_ETA_OPTIONS;
    earlyGoLiveOptions = EARLY_GOLIVE_OPTIONS;

    @wire(getOnboarding, { accountId: '$recordId' })
    wiredOnboarding(result) {
        this._wiredOnb = result;
        if (result.data) {
            this.onboarding = result.data;
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.onboarding = undefined;
        }
    }

    @wire(getSuccessPlan, { accountId: '$recordId' })
    wiredSuccessPlan(result) {
        this._wiredSp = result;
        if (result.data) {
            this.successPlan = result.data;
        } else if (result.error) {
            this.successPlan = undefined;
        }
    }

    // ── Gate 1 Checklist ──

    get gate1Items() {
        if (!this.onboarding) return [];
        return [
            {
                key: 'ae-handover',
                label: 'AE Handover documentation reviewed',
                hint: 'SF Handover Record opened \u00b7 all mandatory fields read',
                checked: this.onboarding.AE_Handover_Reviewed__c,
                field: 'AE_Handover_Reviewed__c'
            },
            {
                key: 'context-validated',
                label: 'Customer context validated',
                hint: 'Goals \u00b7 expectations \u00b7 setup requirements clear',
                checked: this.onboarding.Customer_Context_Validated__c,
                field: 'Customer_Context_Validated__c'
            },
            {
                key: 'tech-setup',
                label: 'Technical setup path confirmed (ATS ETA known)',
                hint: 'ATS type \u00b7 integration ETA \u00b7 setup path clear',
                checked: this.onboarding.Tech_Setup_Path_Confirmed__c,
                field: 'Tech_Setup_Path_Confirmed__c'
            },
            {
                key: 'ats-case',
                label: 'ATS New Onboarding Case opened',
                hint: 'Triggered via AE checkbox at Contract Received or manually by O-Team',
                checked: this.onboarding.ATS_Case_Opened__c,
                field: 'ATS_Case_Opened__c',
                badge: 'O-Team'
            },
            {
                key: 'ownership-clear',
                label: 'Ownership & next steps clear \u2014 no critical blocker',
                hint: '',
                checked: this.onboarding.Ownership_Next_Steps_Clear__c,
                field: 'Ownership_Next_Steps_Clear__c'
            }
        ];
    }

    get gate1CheckedCount() {
        if (!this.onboarding) return 0;
        return [
            this.onboarding.AE_Handover_Reviewed__c,
            this.onboarding.Customer_Context_Validated__c,
            this.onboarding.Tech_Setup_Path_Confirmed__c,
            this.onboarding.ATS_Case_Opened__c,
            this.onboarding.Ownership_Next_Steps_Clear__c
        ].filter(Boolean).length;
    }

    get gate1Total() {
        return 5;
    }

    get gate1Progress() {
        return (this.gate1CheckedCount / this.gate1Total) * 100;
    }

    get progressBarStyle() {
        return `width:${this.gate1Progress}%`;
    }

    get gate1SectionLabel() {
        return `Gate 1 — Checklist & Validation   ${this.gate1CheckedCount} / ${this.gate1Total}`;
    }

    get gate1Validated() {
        return this.onboarding && this.onboarding.Gate_1_Validated__c;
    }

    get ihcSlaLabel() {
        return '\u2264 2 WD after ACM assignment';
    }

    get introSlaLabel() {
        return '\u2264 1 WD after IHC #1 \u00b7 15\u201320 min';
    }

    // ── Gate 1 Fields ──

    get customerGoal() {
        return this.successPlan ? this.successPlan.Customer_Goal__c || '' : '';
    }

    get redFlags() {
        return this.successPlan ? this.successPlan.Initial_Risk_Assessment__c || '' : '';
    }

    get atsSetupPath() {
        return this.successPlan ? this.successPlan.ATS_Setup_Path__c || '' : '';
    }

    get atsIntegrationEta() {
        return this.successPlan ? this.successPlan.ATS_Integration_ETA__c || '' : '';
    }

    get kickoffDateTentative() {
        return this.onboarding ? this.onboarding.Kickoff_Date_Tentative__c || '' : '';
    }

    get blockersOpenItems() {
        return this.successPlan ? this.successPlan.Blockers_Open_Items__c || '' : '';
    }

    // ── Intro Call ──

    get introItems() {
        if (!this.onboarding || !this.successPlan) return [];
        return [
            {
                key: 'warm-intro',
                label: 'Warm Intro & ACM positioning',
                hint: 'ACM = 90-day partner \u00b7 O-Team = technical setup \u00b7 ACM coordinates overall experience',
                checked: this.onboarding.Intro_Warm_Intro_Done__c,
                field: 'Intro_Warm_Intro_Done__c',
                target: 'onboarding',
                type: 'checkbox'
            },
            {
                key: 'goal-confirmed',
                label: 'Customer Goal confirmed',
                checked: this.successPlan.Customer_Goal_Confirmed__c,
                field: 'Customer_Goal_Confirmed__c',
                target: 'successPlan',
                type: 'checkbox-text',
                textField: 'Customer_Goal__c',
                textValue: this.successPlan.Customer_Goal__c || ''
            },
            {
                key: 'journey-preview',
                label: 'Journey Preview given',
                hint: 'Kickoff \u2192 Call #1 \u2192 Call #2 \u2192 F2F \u2192 Review',
                checked: this.onboarding.Intro_Journey_Preview_Done__c,
                field: 'Intro_Journey_Preview_Done__c',
                target: 'onboarding',
                type: 'checkbox'
            },
            {
                key: 'kickoff-aligned',
                label: 'Kickoff tentatively aligned',
                checked: this.onboarding.Intro_Kickoff_Aligned__c,
                field: 'Intro_Kickoff_Aligned__c',
                target: 'onboarding',
                type: 'checkbox'
            },
            {
                key: 'early-golive',
                label: 'Early Go-Live discussed (only on customer request / ETA >4 wks)',
                checked: false,
                field: 'Early_Go_Live_Decision__c',
                target: 'successPlan',
                type: 'picklist',
                picklistValue: this.successPlan.Early_Go_Live_Decision__c || 'Not Applicable - Standard',
                picklistOptions: EARLY_GOLIVE_OPTIONS
            },
            {
                key: 'operator-availability',
                label: 'Operator availability & comm. style',
                checked: !!this.successPlan.Operator_Availability__c,
                field: 'Operator_Availability__c',
                target: 'successPlan',
                type: 'checkbox-text',
                textField: 'Operator_Availability__c',
                textValue: this.successPlan.Operator_Availability__c || ''
            },
            {
                key: 'followup-sent',
                label: 'Follow-up mail & Journey Plan sent',
                hint: '',
                checked: this.onboarding.Intro_Followup_Sent__c,
                field: 'Intro_Followup_Sent__c',
                target: 'onboarding',
                type: 'checkbox'
            }
        ];
    }

    get introDate() {
        return this.onboarding ? this.onboarding.Intro_Date__c || '' : '';
    }

    // ── Gate 1 checkbox handler ──

    handleGate1Check(event) {
        const field = event.currentTarget.dataset.field;
        const checked = event.detail.checked;
        this.saveOnbField(field, checked);
    }

    // ── Gate 1 field handlers ──

    handleSpFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.detail.value !== undefined ? event.detail.value : event.target.value;
        this.debounceSave('sp', field, value);
    }

    handleOnbFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.detail.value !== undefined ? event.detail.value : event.target.value;
        this.debounceSave('onb', field, value);
    }

    handleLookupChange(event) {
        const field = event.currentTarget.dataset.field;
        const selectedId = event.detail.recordId || null;
        this.saveSpField(field, selectedId);
    }

    // ── Intro Call handlers ──

    handleIntroCheck(event) {
        const field = event.currentTarget.dataset.field;
        const target = event.currentTarget.dataset.target;
        const checked = event.detail.checked;
        if (target === 'onboarding') {
            this.saveOnbField(field, checked);
        } else {
            this.saveSpField(field, checked);
        }
    }

    handleIntroTextChange(event) {
        const field = event.currentTarget.dataset.field;
        const target = event.currentTarget.dataset.target;
        const value = event.detail.value !== undefined ? event.detail.value : event.target.value;
        if (target === 'successPlan') {
            this.debounceSave('sp', field, value);
        } else {
            this.debounceSave('onb', field, value);
        }
    }

    handleIntroPicklistChange(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.detail.value;
        this.saveSpField(field, value);
    }

    handleIntroDateChange(event) {
        const value = event.detail.value;
        this.saveOnbField('Intro_Date__c', value);
    }

    // ── Save helpers ──

    debounceSave(type, field, value) {
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            if (type === 'sp') {
                this.saveSpField(field, value);
            } else {
                this.saveOnbField(field, value);
            }
        }, 800);
    }

    async saveOnbField(field, value) {
        if (!this.onboarding) return;
        this.isSaving = true;
        try {
            const fields = {};
            fields[field] = value;
            await saveOnboarding({ recordId: this.onboarding.Id, fields });
            await refreshApex(this._wiredOnb);
        } catch (e) {
            this.showToast('Error', e.body?.message || 'Failed to save', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    async saveSpField(field, value) {
        if (!this.successPlan) return;
        this.isSaving = true;
        try {
            const fields = {};
            fields[field] = value;
            await saveSuccessPlan({ recordId: this.successPlan.Id, fields });
            await refreshApex(this._wiredSp);
        } catch (e) {
            this.showToast('Error', e.body?.message || 'Failed to save', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
