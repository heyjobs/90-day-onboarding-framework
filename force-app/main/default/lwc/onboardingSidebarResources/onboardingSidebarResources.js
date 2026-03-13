import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import ONBOARDING_VISIBILITY from '@salesforce/messageChannel/OnboardingTabVisibility__c';
import { MOCK_RESOURCES, MOCK_DAY0_LOGIC } from './mockData';

export default class OnboardingSidebarResources extends LightningElement {
    @wire(MessageContext) messageContext;

    isVisible = false;
    resources = MOCK_RESOURCES;
    day0Logic = MOCK_DAY0_LOGIC;

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ONBOARDING_VISIBILITY, (message) => {
            if (message.visible !== undefined) this.isVisible = message.visible;
        });
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
    }
}
