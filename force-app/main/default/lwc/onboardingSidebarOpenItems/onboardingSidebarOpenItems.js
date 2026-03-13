import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getAlerts from '@salesforce/apex/OnboardingAlertService.getAlerts';

export default class OnboardingSidebarOpenItems extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    onboardingId;
    alerts = [];

    @wire(getAlerts, { onboardingId: '$onboardingId' })
    wiredAlerts({ data, error }) {
        if (data) {
            this.alerts = data.map((item, idx) => ({
                id: `alert-${idx}`,
                severity: item.severity,
                title: item.title,
                description: item.description,
                phase: item.phase,
                category: item.category,
                severityClass: `severity-dot severity-${(item.severity || '').toLowerCase()}`,
                categoryBadgeClass: item.category === 'Now'
                    ? 'slds-badge slds-theme_error'
                    : 'slds-badge'
            }));
        } else if (error) {
            this.alerts = [];
        }
    }

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.visible !== undefined) this.isVisible = message.visible;
            if (message.onboardingId) {
                this.onboardingId = message.onboardingId;
            }
        });
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
    }

    get cardTitle() {
        return `Now & Next (${this.alerts.length})`;
    }

    get hasAlerts() {
        return this.alerts.length > 0;
    }

    get nowAlerts() {
        return this.alerts.filter(a => a.category === 'Now');
    }

    get nextAlerts() {
        return this.alerts.filter(a => a.category === 'Next');
    }

    get hasNowAlerts() {
        return this.nowAlerts.length > 0;
    }

    get hasNextAlerts() {
        return this.nextAlerts.length > 0;
    }
}
