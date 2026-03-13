import { LightningElement, api, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import getOnboarding from '@salesforce/apex/OnboardingController.getOnboarding';
import TAB_NAME from '@salesforce/label/c.Onboarding_Tab_Name';

export default class OnboardingTabContainer extends LightningElement {
    @api recordId;
    @wire(MessageContext) messageContext;

    label = { tabName: TAB_NAME };

    onboarding;
    error;
    _pollId;
    _lastVisible;

    @wire(getOnboarding, { accountId: '$recordId' })
    wiredOnboarding(result) {
        if (result.data) {
            this.onboarding = result.data;
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.onboarding = undefined;
        }
    }

    get currentPhase() {
        return this.onboarding ? this.onboarding.Current_Phase__c || 'overview' : 'overview';
    }

    connectedCallback() {
        this._pollId = setInterval(() => {
            const marker = this.template.querySelector('[data-id="visibility-marker"]');
            const rect = marker ? marker.getBoundingClientRect() : null;
            const visible = rect ? rect.width > 0 || rect.height > 0 : false;
            if (visible !== this._lastVisible) {
                this._lastVisible = visible;
                this.publishState(visible);
            }
        }, 300);
    }

    disconnectedCallback() {
        clearInterval(this._pollId);
        try {
            publish(this.messageContext, ONBOARDING_VISIBILITY, {
                visible: false,
                currentPhase: null,
                accountId: null,
                onboardingId: null
            });
        } catch (e) {
            // Message context may be invalid during page navigation
        }
    }

    publishState(visible) {
        publish(this.messageContext, ONBOARDING_VISIBILITY, {
            visible,
            currentPhase: visible ? this.currentPhase : null,
            accountId: visible ? this.recordId : null,
            onboardingId: visible && this.onboarding ? this.onboarding.Id : null
        });
    }
}
