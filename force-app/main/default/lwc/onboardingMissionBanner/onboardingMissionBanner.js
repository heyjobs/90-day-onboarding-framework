import { LightningElement, api } from 'lwc';

const PHASE_CONFIG = {
    'pre-phase': {
        icon: '\u{1F680}',
        title: 'ACM MISSION \u2014 PRE-PHASE',
        mission: '"My customer knows who I am. Setup is in motion. We are ready for Day 0."',
        customerFeels: '"I just signed \u2014 what happens now?" \u2192 You\'re in good hands. Here\'s exactly what comes next.',
        bgColor: '#faf5ff',
        borderColor: '#7c3aed',
        iconBg: '#f3e8ff',
        titleColor: '#7c3aed',
        textColor: '#3d1a78',
        labelColor: '#7c3aed'
    },
    'phase-1': {
        icon: '\u26A1',
        title: 'ACM MISSION \u2014 PHASE 1 \u00B7 ACTIVATION',
        mission: '"The account is live. The operator understands what\'s coming \u2014 and we know who we\'re working with."',
        customerFeels: '"We\'re live \u2014 but does it actually work?" \u2192 Your system is confirmed. We\'re right here with you.',
        bgColor: '#f0f9ff',
        borderColor: '#0369a1',
        iconBg: '#e0f2fe',
        titleColor: '#0369a1',
        textColor: '#0c4a6e',
        labelColor: '#0369a1'
    },
    'phase-2': {
        icon: '\u{1F4C8}',
        title: 'ACM MISSION \u2014 PHASE 2 \u00B7 EARLY VALUE',
        mission: '"The operator sees real results, works independently \u2014 the product is correctly set up."',
        customerFeels: '"I see data \u2014 but what does it mean?" \u2192 Let\'s look at the results together and improve.',
        bgColor: '#f0f9ff',
        borderColor: '#0176d3',
        iconBg: '#e8f4fd',
        titleColor: '#0176d3',
        textColor: '#014486',
        labelColor: '#0176d3'
    },
    'phase-3': {
        icon: '\u{1F91D}',
        title: 'ACM MISSION \u2014 PHASE 3 \u00B7 ADOPTION',
        mission: '"The operator works independently. The senior stakeholder is aligned. The next step is becoming clear."',
        customerFeels: '"This is getting real \u2014 I want to go deeper." \u2192 Let\'s get strategic \u2014 ideally in person.',
        bgColor: '#fffbf5',
        borderColor: '#c96b00',
        iconBg: '#fef5e8',
        titleColor: '#c96b00',
        textColor: '#7c2d12',
        labelColor: '#c96b00'
    },
    'phase-4': {
        icon: '\u{1F3C1}',
        title: 'ACM MISSION \u2014 PHASE 4 \u00B7 REVIEW',
        mission: '"Results proven. Next step clear."',
        customerFeels: '"90 days \u2014 was it worth it?" \u2192 Here\'s what we achieved. Here\'s where we\'re going.',
        bgColor: '#f0fff4',
        borderColor: '#2e844a',
        iconBg: '#eaf5ea',
        titleColor: '#2e844a',
        textColor: '#1a4731',
        labelColor: '#2e844a'
    }
};

export default class OnboardingMissionBanner extends LightningElement {
    @api currentPhase = 'pre-phase';

    get config() {
        return PHASE_CONFIG[this.currentPhase] || null;
    }

    get showBanner() {
        return this.currentPhase !== 'overview' && !!this.config;
    }

    get bannerStyle() {
        const c = this.config;
        if (!c) return '';
        return `background-color: ${c.bgColor}; border: 1px solid ${c.borderColor}; border-radius: 0.25rem;`;
    }

    get iconWrapStyle() {
        const c = this.config;
        if (!c) return '';
        return `background-color: ${c.iconBg};`;
    }

    get titleStyle() {
        const c = this.config;
        if (!c) return '';
        return `color: ${c.titleColor};`;
    }

    get textStyle() {
        const c = this.config;
        if (!c) return '';
        return `color: ${c.textColor};`;
    }

    get labelStyle() {
        const c = this.config;
        if (!c) return '';
        return `color: ${c.labelColor};`;
    }

    get icon() {
        return this.config ? this.config.icon : '';
    }

    get title() {
        return this.config ? this.config.title : '';
    }

    get mission() {
        return this.config ? this.config.mission : '';
    }

    get customerFeels() {
        return this.config ? this.config.customerFeels : '';
    }
}
