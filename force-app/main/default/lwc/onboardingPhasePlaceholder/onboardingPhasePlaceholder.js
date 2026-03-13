import { LightningElement, api } from 'lwc';

export default class OnboardingPhasePlaceholder extends LightningElement {
    @api phaseNumber;
    @api phaseTitle;

    get displayTitle() {
        return this.phaseTitle || `Phase ${this.phaseNumber}`;
    }
}
