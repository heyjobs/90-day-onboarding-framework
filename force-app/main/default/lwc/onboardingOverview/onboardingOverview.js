import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getOnboarding from '@salesforce/apex/OnboardingController.getOnboarding';
import getSuccessPlan from '@salesforce/apex/OnboardingController.getSuccessPlan';
import saveOnboarding from '@salesforce/apex/OnboardingController.saveOnboarding';
import saveSuccessPlan from '@salesforce/apex/OnboardingController.saveSuccessPlan';
import getAlerts from '@salesforce/apex/OnboardingAlertService.getAlerts';
import evaluateSla from '@salesforce/apex/OnboardingSlaService.evaluateSla';
import getAdditionalTouchpoints from '@salesforce/apex/OnboardingController.getAdditionalTouchpoints';
import createAdditionalTouchpoint from '@salesforce/apex/OnboardingController.createAdditionalTouchpoint';
import getPilotHandoverTask from '@salesforce/apex/OnboardingController.getPilotHandoverTask';
import getCustomer360Handover from '@salesforce/apex/OnboardingController.getCustomer360Handover';
import getAtsOnboardingCase from '@salesforce/apex/OnboardingController.getAtsOnboardingCase';

const STANDARD_TOUCHPOINTS = [
    { phase: 'PRE-PHASE', phaseKey: 'Pre-Phase', items: [
        { key: 'ihc1', name: 'IHC #1 \u2014 Internal Handover Call', field: 'IHC1_Date__c', slaName: 'IHC #1', type: 'Internal' },
        { key: 'ats-onboarding', name: 'ATS Onboarding', field: null, slaName: null, type: 'O-Team' },
        { key: 'intro', name: 'Intro Call', field: 'Intro_Date__c', slaName: 'Intro Call', type: 'Customer' }
    ]},
    { phase: 'PHASE 1 \u2014 ACTIVATION', phaseKey: 'Phase 1', items: [
        { key: 'kickoff', name: 'Kickoff', field: 'Kickoff_Date__c', slaName: 'Kickoff', type: 'Customer' }
    ]},
    { phase: 'PHASE 2 \u2014 EARLY VALUE', phaseKey: 'Phase 2', items: [
        { key: 'call1', name: 'Call #1 \u2014 O-Min Validation', field: 'Call1_Date__c', slaName: 'Call #1', type: 'Customer' },
        { key: 'call2', name: 'Call #2 \u2014 Optimization', field: 'Call2_Date__c', slaName: 'Call #2', type: 'Customer' }
    ]},
    { phase: 'PHASE 3 \u2014 ADOPTION', phaseKey: 'Phase 3', items: [
        { key: 'call3', name: 'Call #3 \u2014 Strategic Touchpoint', field: 'Call3_Date__c', slaName: 'Call #3', type: 'Customer' },
        { key: 'f2f', name: 'F2F \u2014 Strategic Milestone', field: 'F2F_Date__c', slaName: 'F2F', type: 'Customer' },
        { key: 'call4', name: 'Call #4 \u2014 F2F Recap', field: 'Call4_Date__c', slaName: 'Call #4', type: 'Customer' }
    ]},
    { phase: 'PHASE 4 \u2014 REVIEW', phaseKey: 'Phase 4', items: [
        { key: 'selfcheck', name: '70-Day Self-Check', field: 'Self_Check_Date__c', slaName: null, type: 'Internal' },
        { key: 'call5', name: 'Call #5 \u2014 Pre-Review Alignment', field: 'Call5_Date__c', slaName: 'Call #5', type: 'Customer' },
        { key: 'tlgate', name: 'TL Gate', field: 'TL_Gate_Date__c', slaName: 'TL Gate', type: 'Internal' },
        { key: 'call6', name: 'Call #6 \u2014 90-Day Review', field: 'Call6_Date__c', slaName: 'Call #6', type: 'Customer' }
    ]}
];

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

const TOUCHPOINT_TYPE_OPTIONS = [
    { label: 'Ad-hoc Call', value: 'Ad-hoc Call' },
    { label: 'Escalation', value: 'Escalation' },
    { label: 'Additional Meeting', value: 'Additional Meeting' },
    { label: 'Check-in', value: 'Check-in' }
];

const PHASE_OPTIONS = [
    { label: 'Pre-Phase', value: 'Pre-Phase' },
    { label: 'Phase 1', value: 'Phase 1' },
    { label: 'Phase 2', value: 'Phase 2' },
    { label: 'Phase 3', value: 'Phase 3' },
    { label: 'Phase 4', value: 'Phase 4' }
];

const DURATION_OPTIONS = [
    { label: '15 min', value: '15' },
    { label: '30 min', value: '30' },
    { label: '45 min', value: '45' },
    { label: '60 min', value: '60' }
];

export default class OnboardingOverview extends LightningElement {
    @api recordId;
    @wire(MessageContext) messageContext;

    onboarding;
    successPlan;
    onboardingId;
    alerts = [];
    slaResults = [];
    additionalTouchpoints = [];
    pilotHandoverTask;
    customer360Handover;
    atsOnboardingCase;
    _wiredOnb;
    _wiredSp;
    _wiredAlerts;
    _wiredSla;
    _wiredAdditional;
    _saveTimeout;

    // Track which touchpoint is expanded (only one at a time)
    expandedKey = null;

    // Track which IHC sub-sections are expanded
    expandedSubSections = {};

    @wire(getPilotHandoverTask, { accountId: '$recordId' })
    wiredPilotTask({ data }) {
        if (data) this.pilotHandoverTask = data;
    }

    @wire(getCustomer360Handover, { accountId: '$recordId' })
    wiredC360({ data }) {
        if (data) this.customer360Handover = data;
    }

    @wire(getAtsOnboardingCase, { accountId: '$recordId' })
    wiredAtsCase({ data }) {
        if (data) this.atsOnboardingCase = data;
    }

    // Modal state
    showModal = false;
    modalSubject = '';
    modalType = 'Ad-hoc Call';
    modalDate = '';
    modalPhase = 'Pre-Phase';
    modalDuration = '30';
    modalNotes = '';
    isSaving = false;

    atsSetupPathOptions = ATS_SETUP_PATH_OPTIONS;
    atsEtaOptions = ATS_ETA_OPTIONS;
    earlyGoLiveOptions = EARLY_GOLIVE_OPTIONS;
    touchpointTypeOptions = TOUCHPOINT_TYPE_OPTIONS;
    phaseOptions = PHASE_OPTIONS;
    durationOptions = DURATION_OPTIONS;

    @wire(getOnboarding, { accountId: '$recordId' })
    wiredOnb(result) {
        this._wiredOnb = result;
        if (result.data) {
            this.onboarding = result.data;
            this.onboardingId = result.data.Id;
        }
    }

    @wire(getSuccessPlan, { accountId: '$recordId' })
    wiredSp(result) {
        this._wiredSp = result;
        if (result.data) this.successPlan = result.data;
    }

    @wire(getAlerts, { onboardingId: '$onboardingId' })
    wiredAlerts(result) {
        this._wiredAlerts = result;
        if (result.data) {
            this.alerts = result.data.map((a, i) => ({
                id: `alert-${i}`,
                ...a,
                borderClass: `alert-border alert-border-${(a.severity || '').toLowerCase()}`
            }));
        }
    }

    @wire(evaluateSla, { onboardingId: '$onboardingId' })
    wiredSla(result) {
        this._wiredSla = result;
        if (result.data) this.slaResults = result.data;
    }

    @wire(getAdditionalTouchpoints, { accountId: '$recordId' })
    wiredAdditional(result) {
        this._wiredAdditional = result;
        if (result.data) this.additionalTouchpoints = result.data;
    }

    connectedCallback() {
        this._navSubscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.navigateToTouchpoint) {
                this.handleNavigateToTouchpoint(message.navigateToTouchpoint);
            }
        });
    }

    disconnectedCallback() {
        unsubscribe(this._navSubscription);
    }

    handleNavigateToTouchpoint(targetKey) {
        // Special case: scroll to Success Plan sidebar
        if (targetKey === 'successPlan') {
            const spSidebar = document.querySelector('c-onboarding-sidebar-success-plan');
            if (spSidebar) {
                spSidebar.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Expand the target touchpoint card
        this.expandedKey = targetKey;

        // Scroll to it after render
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const card = this.template.querySelector(`[data-key="${targetKey}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Brief highlight effect
                card.classList.add('ov-tp-highlight');
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => card.classList.remove('ov-tp-highlight'), 1500);
            }
        }, 100);
    }

    // ── Computed: Alerts ──

    get hasAlerts() {
        return this.alerts.length > 0;
    }

    get hasOnboarding() {
        return !!this.onboarding;
    }

    // ── Computed: Timeline with expand state ──

    get timelinePhases() {
        if (!this.onboarding) return [];

        const slaMap = {};
        this.slaResults.forEach(r => { slaMap[r.touchpointName] = r; });

        return STANDARD_TOUCHPOINTS.map(phaseGroup => {
            const items = phaseGroup.items.map(tp => {
                // Special handling for ATS Onboarding — data comes from Case, not Onboarding__c
                if (tp.key === 'ats-onboarding') {
                    const hasCase = this.hasAtsCase;
                    const isDone = hasCase && this.atsOnboardingCase.IsClosed;
                    const isExpanded = this.expandedKey === tp.key;
                    return {
                        key: tp.key,
                        name: hasCase ? `ATS Onboarding \u2014 ${this.atsCaseNumber}` : 'ATS Onboarding',
                        type: tp.type,
                        dateField: null,
                        date: hasCase ? `Created ${this.formatDateTime(this.atsOnboardingCase.CreatedDate)}` : 'No case found',
                        isDone,
                        isOverdue: false,
                        isDue: hasCase && !isDone,
                        isPending: !hasCase,
                        cardClass: this.getCardClass(isDone, false, hasCase && !isDone),
                        slaLabel: hasCase ? this.atsCaseStatus : '',
                        slaBadgeClass: hasCase ? 'sla-badge sla-muted' : '',
                        hasSla: hasCase,
                        isExpanded,
                        chevronIcon: isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                        isIhc1: false,
                        isIntro: false,
                        isAtsOnboarding: true,
                        isGeneric: false
                    };
                }

                const date = tp.field ? this.onboarding[tp.field] : null;
                const sla = tp.slaName ? slaMap[tp.slaName] : null;
                const isDone = !!date;
                const isOverdue = sla && (sla.status === 'Late' || sla.status === 'Critical');
                const isDue = sla && sla.status === 'Due';
                const isExpanded = this.expandedKey === tp.key;

                return {
                    key: tp.key,
                    name: tp.name,
                    type: tp.type,
                    dateField: tp.field,
                    date: date ? this.formatDate(date) : 'Not scheduled',
                    isDone,
                    isOverdue,
                    isDue,
                    isPending: !isDone && !isOverdue && !isDue,
                    cardClass: this.getCardClass(isDone, isOverdue, isDue),
                    slaLabel: this.getSlaLabel(sla),
                    slaBadgeClass: this.getSlaBadgeClass(sla),
                    hasSla: !!sla && isDone && sla.status !== 'Pending',
                    isExpanded,
                    chevronIcon: isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                    // Expanded content type
                    isIhc1: tp.key === 'ihc1',
                    isIntro: tp.key === 'intro',
                    isAtsOnboarding: false,
                    isGeneric: tp.key !== 'ihc1' && tp.key !== 'intro'
                };
            });

            // Merge additional touchpoints for this phase
            const phaseAdditional = this.additionalTouchpoints
                .filter(tp => tp.Onboarding_Phase__c === phaseGroup.phaseKey)
                .map(tp => ({
                    key: `add-${tp.Id}`,
                    name: tp.Subject,
                    type: tp.Onboarding_Touchpoint_Type__c || 'Ad-hoc',
                    date: tp.StartDateTime ? this.formatDate(tp.StartDateTime) : 'Not scheduled',
                    isDone: true,
                    isOverdue: false,
                    isDue: false,
                    isPending: false,
                    cardClass: 'ov-tp ov-tp-additional',
                    slaLabel: tp.Onboarding_Touchpoint_Type__c || '',
                    slaBadgeClass: 'sla-badge sla-muted',
                    hasSla: true,
                    isExpanded: false,
                    chevronIcon: 'utility:chevronright',
                    isIhc1: false,
                    isIntro: false,
                    isGeneric: false,
                    isAdditional: true,
                    eventId: tp.Id,
                    durationMinutes: tp.DurationInMinutes,
                    notes: tp.Description || ''
                }));

            const allItems = [...items, ...phaseAdditional];

            return {
                phase: phaseGroup.phase,
                phaseKey: phaseGroup.phaseKey,
                phaseClass: this.getPhaseHeaderClass(phaseGroup.phaseKey),
                items: allItems,
                hasItems: allItems.length > 0
            };
        });
    }

    // ── IHC#1 expanded data ──

    get gate1Items() {
        if (!this.onboarding) return [];
        return [
            { key: 'ae', label: 'AE Handover documentation reviewed', hint: 'SF Handover Record opened \u00b7 all mandatory fields read', checked: this.onboarding.AE_Handover_Reviewed__c, field: 'AE_Handover_Reviewed__c' },
            { key: 'ctx', label: 'Customer context validated', hint: 'Goals \u00b7 expectations \u00b7 setup requirements clear', checked: this.onboarding.Customer_Context_Validated__c, field: 'Customer_Context_Validated__c' },
            { key: 'tech', label: 'Technical setup path confirmed (ATS ETA known)', hint: 'ATS type \u00b7 integration ETA \u00b7 setup path clear', checked: this.onboarding.Tech_Setup_Path_Confirmed__c, field: 'Tech_Setup_Path_Confirmed__c' },
            { key: 'ats', label: 'ATS New Onboarding Case opened', hint: 'Triggered via AE checkbox at Contract Received or manually by O-Team', checked: this.onboarding.ATS_Case_Opened__c, field: 'ATS_Case_Opened__c', badge: 'O-Team' },
            { key: 'own', label: 'Ownership & next steps clear \u2014 no critical blocker', checked: this.onboarding.Ownership_Next_Steps_Clear__c, field: 'Ownership_Next_Steps_Clear__c' }
        ];
    }

    get gate1CheckedCount() {
        if (!this.onboarding) return 0;
        return [this.onboarding.AE_Handover_Reviewed__c, this.onboarding.Customer_Context_Validated__c, this.onboarding.Tech_Setup_Path_Confirmed__c, this.onboarding.ATS_Case_Opened__c, this.onboarding.Ownership_Next_Steps_Clear__c].filter(Boolean).length;
    }

    get gate1Total() { return 5; }
    get progressBarStyle() { return `width:${(this.gate1CheckedCount / 5) * 100}%`; }
    get gate1Validated() { return this.onboarding && this.onboarding.Gate_1_Validated__c; }

    // ── IHC#1 Sub-sections ──

    handleToggleSubSection(event) {
        const key = event.currentTarget.dataset.subsection;
        this.expandedSubSections = {
            ...this.expandedSubSections,
            [key]: !this.expandedSubSections[key]
        };
    }

    get isSubSectionHandoverExpanded() { return !!this.expandedSubSections.handover; }
    get isSubSectionContextExpanded() { return !!this.expandedSubSections.context; }
    get subSectionHandoverChevron() { return this.isSubSectionHandoverExpanded ? 'utility:chevrondown' : 'utility:chevronright'; }
    get subSectionContextChevron() { return this.isSubSectionContextExpanded ? 'utility:chevrondown' : 'utility:chevronright'; }

    // Pilot Handover Documentation Review
    get handoverDocSharedTimestamp() {
        if (!this.customer360Handover || !this.customer360Handover.Timestamp_Documentation_Completed__c) return 'Not available';
        return this.formatDateTime(this.customer360Handover.Timestamp_Documentation_Completed__c);
    }

    get handoverDocReviewedTimestamp() {
        if (!this.pilotHandoverTask || !this.pilotHandoverTask.CompletedDateTime) return 'Not completed';
        return this.formatDateTime(this.pilotHandoverTask.CompletedDateTime);
    }

    get handoverSlaStatus() {
        if (!this.customer360Handover || !this.customer360Handover.Timestamp_Documentation_Completed__c) return 'Pending';
        if (!this.pilotHandoverTask) return 'Pending';

        const shared = new Date(this.customer360Handover.Timestamp_Documentation_Completed__c);
        const deadline = this.addWorkingDaysJs(shared, 2);

        if (this.pilotHandoverTask.CompletedDateTime) {
            const completed = new Date(this.pilotHandoverTask.CompletedDateTime);
            return completed <= deadline ? 'On-Time' : 'Late';
        }
        // Not completed yet — check if overdue
        const now = new Date();
        return now > deadline ? 'Late' : 'Due';
    }

    get handoverSlaClass() {
        const s = this.handoverSlaStatus;
        if (s === 'On-Time') return 'sla-badge sla-green';
        if (s === 'Late') return 'sla-badge sla-red';
        if (s === 'Due') return 'sla-badge sla-amber';
        return 'sla-badge sla-muted';
    }

    get handoverTaskStatus() {
        if (!this.pilotHandoverTask) return 'No task found';
        return this.pilotHandoverTask.Status;
    }

    // Customer Context Validated
    get handoverQuality() {
        if (!this.customer360Handover || !this.customer360Handover.Handover_Documentation_Quality__c) return 'Not assessed';
        return this.customer360Handover.Handover_Documentation_Quality__c;
    }

    get handoverQualityComments() {
        if (!this.customer360Handover || !this.customer360Handover.Handover_Quality_Comments__c) return '\u2014';
        return this.customer360Handover.Handover_Quality_Comments__c;
    }

    get customerContextValidated() {
        return this.customer360Handover &&
            this.customer360Handover.Handover_Documentation_Quality__c &&
            this.customer360Handover.Handover_Documentation_Quality__c !== 'Not Acceptable';
    }

    // ── ATS Onboarding Case ──

    get hasAtsCase() { return !!this.atsOnboardingCase; }
    get atsCaseNumber() { return this.atsOnboardingCase ? this.atsOnboardingCase.CaseNumber : ''; }
    get atsCaseStatus() { return this.atsOnboardingCase ? this.atsOnboardingCase.Status : ''; }
    get atsCaseSubject() { return this.atsOnboardingCase ? this.atsOnboardingCase.Subject || '' : ''; }
    get atsCaseOwner() { return this.atsOnboardingCase && this.atsOnboardingCase.Owner ? this.atsOnboardingCase.Owner.Name : '\u2014'; }
    get atsCaseCreatedDate() { return this.atsOnboardingCase ? this.formatDateTime(this.atsOnboardingCase.CreatedDate) : ''; }
    get atsCaseIntegrationType() { return this.atsOnboardingCase ? this.atsOnboardingCase.Integration_Type__c || '\u2014' : '\u2014'; }
    get atsCasePriority() { return this.atsOnboardingCase ? this.atsOnboardingCase.Priority || '\u2014' : '\u2014'; }

    get customerGoal() { return this.successPlan ? this.successPlan.Customer_Goal__c || '' : ''; }
    get redFlags() { return this.successPlan ? this.successPlan.Initial_Risk_Assessment__c || '' : ''; }
    get atsSetupPath() { return this.successPlan ? this.successPlan.ATS_Setup_Path__c || '' : ''; }
    get atsIntegrationEta() { return this.successPlan ? this.successPlan.ATS_Integration_ETA__c || '' : ''; }
    get kickoffDateTentative() { return this.onboarding ? this.onboarding.Kickoff_Date_Tentative__c || '' : ''; }
    get blockersOpenItems() { return this.successPlan ? this.successPlan.Blockers_Open_Items__c || '' : ''; }

    // ── Intro Call expanded data ──

    get introItems() {
        if (!this.onboarding || !this.successPlan) return [];
        return [
            { key: 'warm', label: 'Warm Intro & ACM positioning', hint: 'ACM = 90-day partner \u00b7 O-Team = technical setup', checked: this.onboarding.Intro_Warm_Intro_Done__c, field: 'Intro_Warm_Intro_Done__c', target: 'onboarding' },
            { key: 'goal', label: 'Customer Goal confirmed', checked: this.successPlan.Customer_Goal_Confirmed__c, field: 'Customer_Goal_Confirmed__c', target: 'successPlan', textField: 'Customer_Goal__c', textValue: this.successPlan.Customer_Goal__c || '' },
            { key: 'journey', label: 'Journey Preview given', hint: 'Kickoff \u2192 Call #1 \u2192 Call #2 \u2192 F2F \u2192 Review', checked: this.onboarding.Intro_Journey_Preview_Done__c, field: 'Intro_Journey_Preview_Done__c', target: 'onboarding' },
            { key: 'kickoff', label: 'Kickoff tentatively aligned', checked: this.onboarding.Intro_Kickoff_Aligned__c, field: 'Intro_Kickoff_Aligned__c', target: 'onboarding' },
            { key: 'golive', label: 'Early Go-Live discussed (only on customer request / ETA >4 wks)', checked: false, field: 'Early_Go_Live_Decision__c', target: 'successPlan', picklistValue: this.successPlan.Early_Go_Live_Decision__c || 'Not Applicable - Standard', picklistOptions: EARLY_GOLIVE_OPTIONS },
            { key: 'avail', label: 'Operator availability & comm. style', checked: !!this.successPlan.Operator_Availability__c, field: 'Operator_Availability__c', target: 'successPlan', textField: 'Operator_Availability__c', textValue: this.successPlan.Operator_Availability__c || '' },
            { key: 'followup', label: 'Follow-up mail & Journey Plan sent', checked: this.onboarding.Intro_Followup_Sent__c, field: 'Intro_Followup_Sent__c', target: 'onboarding' }
        ];
    }

    // ── Toggle expand ──

    handleToggleExpand(event) {
        const key = event.currentTarget.dataset.key;
        this.expandedKey = this.expandedKey === key ? null : key;
    }

    // ── Save handlers ──

    handleGate1Check(event) {
        const field = event.currentTarget.dataset.field;
        this.saveOnbField(field, event.detail.checked);
    }

    handleSpFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        this.debounceSave('sp', field, event.detail.value);
    }

    handleOnbFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        this.debounceSave('onb', field, event.detail.value);
    }

    handleLookupChange(event) {
        const field = event.currentTarget.dataset.field;
        this.saveSpField(field, event.detail.recordId || null);
    }

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
        if (target === 'successPlan') {
            this.debounceSave('sp', field, event.detail.value);
        } else {
            this.debounceSave('onb', field, event.detail.value);
        }
    }

    handleIntroPicklistChange(event) {
        const field = event.currentTarget.dataset.field;
        this.saveSpField(field, event.detail.value);
    }

    debounceSave(type, field, value) {
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            if (type === 'sp') this.saveSpField(field, value);
            else this.saveOnbField(field, value);
        }, 800);
    }

    async saveOnbField(field, value) {
        if (!this.onboarding) return;
        try {
            const fields = {};
            fields[field] = value;
            await saveOnboarding({ recordId: this.onboarding.Id, fields });
            await refreshApex(this._wiredOnb);
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: e.body?.message || 'Save failed', variant: 'error' }));
        }
    }

    async saveSpField(field, value) {
        if (!this.successPlan) return;
        try {
            const fields = {};
            fields[field] = value;
            await saveSuccessPlan({ recordId: this.successPlan.Id, fields });
            await refreshApex(this._wiredSp);
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: e.body?.message || 'Save failed', variant: 'error' }));
        }
    }

    // ── Add Touchpoint Modal ──

    handleOpenAddModal(event) {
        const phase = event.currentTarget.dataset.phase;
        this.modalPhase = phase || this.autoDetectPhase();
        this.modalSubject = '';
        this.modalType = 'Ad-hoc Call';
        this.modalDate = '';
        this.modalDuration = '30';
        this.modalNotes = '';
        this.showModal = true;
    }

    handleCloseModal() {
        this.showModal = false;
    }

    handleModalFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        this[field] = event.detail.value;
    }

    async handleSaveTouchpoint() {
        if (!this.modalSubject) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: 'Subject is required', variant: 'error' }));
            return;
        }
        if (!this.modalDate) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: 'Date is required', variant: 'error' }));
            return;
        }

        this.isSaving = true;
        try {
            await createAdditionalTouchpoint({
                accountId: this.recordId,
                subject: this.modalSubject,
                startDateTime: new Date(this.modalDate).toISOString(),
                durationMinutes: parseInt(this.modalDuration, 10),
                touchpointType: this.modalType,
                phase: this.modalPhase,
                notes: this.modalNotes
            });
            this.showModal = false;
            await refreshApex(this._wiredAdditional);
            this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Touchpoint created', variant: 'success' }));
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: e.body?.message || 'Failed to create touchpoint', variant: 'error' }));
        } finally {
            this.isSaving = false;
        }
    }

    autoDetectPhase() {
        if (!this.onboarding || !this.onboarding.Current_Phase__c) return 'Pre-Phase';
        return this.onboarding.Current_Phase__c;
    }

    // ── Helpers ──

    getCardClass(isDone, isOverdue, isDue) {
        let cls = 'ov-tp';
        if (isDone) cls += ' ov-tp-done';
        else if (isOverdue) cls += ' ov-tp-overdue';
        else if (isDue) cls += ' ov-tp-due';
        else cls += ' ov-tp-pending';
        return cls;
    }

    getSlaLabel(sla) {
        if (!sla) return '';
        if (sla.status === 'On-Time') return '\u2713 Within SLA';
        if (sla.status === 'Late') return 'OVERDUE';
        if (sla.status === 'Critical') return 'CRITICAL';
        if (sla.status === 'Due') {
            const days = sla.daysRemaining;
            return days != null ? `${days}d left` : 'Due';
        }
        if (sla.status === 'Not Due' && sla.windowStart) {
            return `Day ${this.getDayRange(sla)}`;
        }
        return '';
    }

    getDayRange(sla) {
        if (!this.onboarding || !this.onboarding.Day0_Date__c) return '';
        const day0 = new Date(this.onboarding.Day0_Date__c);
        const ws = new Date(sla.windowStart);
        const we = new Date(sla.windowEnd);
        const startDay = Math.round((ws - day0) / 86400000);
        const endDay = Math.round((we - day0) / 86400000);
        return `${startDay}\u2013${endDay}`;
    }

    getSlaBadgeClass(sla) {
        if (!sla) return '';
        if (sla.status === 'On-Time') return 'sla-badge sla-green';
        if (sla.status === 'Late' || sla.status === 'Critical') return 'sla-badge sla-red';
        if (sla.status === 'Due') return 'sla-badge sla-amber';
        return 'sla-badge sla-muted';
    }

    getPhaseHeaderClass(phaseKey) {
        const map = {
            'Pre-Phase': 'phase-header phase-header-purple',
            'Phase 1': 'phase-header phase-header-blue',
            'Phase 2': 'phase-header phase-header-blue',
            'Phase 3': 'phase-header phase-header-amber',
            'Phase 4': 'phase-header phase-header-green'
        };
        return map[phaseKey] || 'phase-header';
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = d.toLocaleString('en-US', { month: 'short' });
        return `${day} ${mon} ${d.getFullYear()}`;
    }

    formatDateTime(dtStr) {
        if (!dtStr) return '';
        const d = new Date(dtStr);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = d.toLocaleString('en-US', { month: 'short' });
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${mon} ${d.getFullYear()}, ${hrs}:${mins}`;
    }

    addWorkingDaysJs(date, days) {
        const result = new Date(date);
        let added = 0;
        while (added < days) {
            result.setDate(result.getDate() + 1);
            const dow = result.getDay();
            if (dow !== 0 && dow !== 6) added++;
        }
        return result;
    }
}
