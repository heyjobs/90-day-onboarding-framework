/**
 * Evaluates alerting rules for the Now & Next panel.
 * Returns severity-ordered alert items per phase.
 */
public with sharing class OnboardingAlertService {

    public class AlertItem implements Comparable {
        @AuraEnabled public String severity;   // Red, Amber, Blue, Green
        @AuraEnabled public String title;
        @AuraEnabled public String description;
        @AuraEnabled public String phase;
        @AuraEnabled public String category;   // Now, Next
        @AuraEnabled public Integer sortOrder;

        public Integer compareTo(Object other) {
            AlertItem o = (AlertItem) other;
            Integer sevComp = severityRank(this.severity) - severityRank(o.severity);
            if (sevComp != 0) return sevComp;
            Integer catComp = categoryRank(this.category) - categoryRank(o.category);
            if (catComp != 0) return catComp;
            return (this.sortOrder != null ? this.sortOrder : 99) -
                   (o.sortOrder != null ? o.sortOrder : 99);
        }

        private Integer severityRank(String sev) {
            if (sev == 'Red') return 0;
            if (sev == 'Amber') return 1;
            if (sev == 'Blue') return 2;
            if (sev == 'Green') return 3;
            return 99;
        }

        private Integer categoryRank(String cat) {
            return cat == 'Now' ? 0 : 1;
        }
    }

    /**
     * Get alerts for an onboarding record.
     */
    @AuraEnabled(cacheable=true)
    public static List<AlertItem> getAlerts(Id onboardingId) {
        Onboarding__c onb = [
            SELECT Id, Day0_Date__c, ACM_Assignment_Date__c,
                   Current_Day__c, Current_Phase__c,
                   Gate_1_Validated__c, Activation_Confirmed__c,
                   IHC1_Date__c, Intro_Date__c, Kickoff_Date__c,
                   Call1_Date__c, Call2_Date__c, Call3_Date__c,
                   Call4_Date__c, Call5_Date__c, Call6_Date__c,
                   F2F_Date__c, TL_Gate_Date__c, Self_Check_Date__c,
                   Review_Date__c, Self_Check_Completed__c,
                   Success_Plan__c
            FROM Onboarding__c
            WHERE Id = :onboardingId
            LIMIT 1
        ];

        if (onb == null) return new List<AlertItem>();

        // Get Success Plan
        Success_Plan__c sp = null;
        if (onb.Success_Plan__c != null) {
            List<Success_Plan__c> sps = [
                SELECT Id, O_Min_Status__c, Health_Status__c,
                       KPI_Draft__c, SS_Engagement_Status__c
                FROM Success_Plan__c
                WHERE Id = :onb.Success_Plan__c
                LIMIT 1
            ];
            if (!sps.isEmpty()) sp = sps[0];
        }

        List<AlertItem> alerts = new List<AlertItem>();
        Integer currentDay = onb.Current_Day__c != null ? (Integer) onb.Current_Day__c : -1;
        String phase = onb.Current_Phase__c;
        Boolean isPrePhase = phase == 'Pre-Phase' || onb.Day0_Date__c == null;

        if (isPrePhase) evaluatePrePhaseAlerts(onb, alerts);
        if (phase == 'Phase 1') evaluatePhase1Alerts(onb, currentDay, alerts);
        if (phase == 'Phase 2') evaluatePhase2Alerts(onb, sp, currentDay, alerts);
        if (phase == 'Phase 3') evaluatePhase3Alerts(onb, sp, currentDay, alerts);
        if (phase == 'Phase 4') evaluatePhase4Alerts(onb, sp, currentDay, alerts);

        alerts.sort();
        return alerts;
    }

    // ── Pre-Phase ──
    private static void evaluatePrePhaseAlerts(Onboarding__c onb, List<AlertItem> alerts) {
        Boolean gate1Done = onb.Gate_1_Validated__c == true;

        if (!gate1Done && onb.Day0_Date__c != null) {
            Integer daysToDay0 = Date.today().daysBetween(onb.Day0_Date__c);
            if (daysToDay0 >= 0 && daysToDay0 <= 3) {
                alerts.add(makeAlert('Red', 'Day-0 imminent — escalate',
                    'Pre-Phase incomplete with Day 0 in ' + daysToDay0 + ' days.', 'Pre-Phase', 'Now', 1));
            }
        }

        if (onb.IHC1_Date__c != null && onb.Intro_Date__c == null) {
            alerts.add(makeAlert('Blue', 'Contact customer by phone',
                'IHC #1 complete. Schedule Intro Call within 1 WD.', 'Pre-Phase', 'Now', 10));
        }

        if (onb.Intro_Date__c != null && onb.Kickoff_Date__c == null) {
            alerts.add(makeAlert('Blue', 'Pre-schedule Kickoff',
                'Based on expected setup closure date.', 'Pre-Phase', 'Next', 20));
        }

        if (gate1Done) {
            alerts.add(makeAlert('Green', 'Pre-Phase complete — ready for Day 0',
                'All Gate 1 items validated.', 'Pre-Phase', 'Now', 30));
        }
    }

    // ── Phase 1 ──
    private static void evaluatePhase1Alerts(Onboarding__c onb, Integer day, List<AlertItem> alerts) {
        if (day > 7 && onb.Kickoff_Date__c == null) {
            alerts.add(makeAlert('Red', 'Kickoff overdue',
                'Day 0 + 5 WD window passed. Schedule immediately.', 'Phase 1', 'Now', 1));
        }

        if (day >= 5 && day <= 12) {
            alerts.add(makeAlert('Blue', 'Call #1 window approaching',
                'Prep Call #1 — O-Min Validation (Day 8-14).', 'Phase 1', 'Next', 10));
        }

        if (onb.Kickoff_Date__c != null && onb.Activation_Confirmed__c == true) {
            alerts.add(makeAlert('Green', 'Phase 1 complete',
                'Kickoff delivered, Activation confirmed. Moving to Phase 2.', 'Phase 1', 'Now', 30));
        }
    }

    // ── Phase 2 ──
    private static void evaluatePhase2Alerts(Onboarding__c onb, Success_Plan__c sp, Integer day, List<AlertItem> alerts) {
        String oMinStatus = sp != null ? sp.O_Min_Status__c : null;

        if (day > 14 && oMinStatus != 'Validated') {
            alerts.add(makeAlert('Red', 'Call #1 — OVERDUE (Day 8-14 window passed)',
                'O-Min validation must happen. Schedule immediately.', 'Phase 2', 'Now', 1));
        } else if (day >= 8 && day <= 14 && (oMinStatus == 'Pending' || oMinStatus == null)) {
            alerts.add(makeAlert('Amber', 'O-Min validation due',
                'Call #1 window open. Customer demonstrates product walkthrough.', 'Phase 2', 'Now', 2));
        }

        if (sp != null && (sp.SS_Engagement_Status__c == 'Not Connected' || sp.SS_Engagement_Status__c == null)) {
            alerts.add(makeAlert('Amber', 'Senior Stakeholder outreach required',
                'Initiate contact before F2F.', 'Phase 2', 'Now', 5));
        }

        if (day >= 25 && onb.F2F_Date__c == null) {
            alerts.add(makeAlert('Blue', 'Schedule F2F — Day 31-60 window',
                'Should be finalized by end of Call #2.', 'Phase 2', 'Next', 15));
        }

        if (onb.Call2_Date__c == null && day >= 16) {
            alerts.add(makeAlert('Blue', 'Call #2 window — Day 18-28',
                'Optimization call. Deepen customer context.', 'Phase 2', 'Next', 20));
        }
    }

    // ── Phase 3 ──
    private static void evaluatePhase3Alerts(Onboarding__c onb, Success_Plan__c sp, Integer day, List<AlertItem> alerts) {
        if (day > 45 && onb.F2F_Date__c == null) {
            alerts.add(makeAlert('Red', 'F2F overdue — schedule now',
                'Must be scheduled within Day 31-60 window.', 'Phase 3', 'Now', 1));
        } else if (day > 31 && onb.F2F_Date__c == null) {
            alerts.add(makeAlert('Amber', 'F2F not yet scheduled',
                'Day 31-60 window. Risk flag triggers at Day 45.', 'Phase 3', 'Now', 2));
        }

        if (day > 45 && sp != null && String.isBlank(sp.KPI_Draft__c)) {
            alerts.add(makeAlert('Amber', 'KPI draft missing',
                'Fill directional KPIs before F2F.', 'Phase 3', 'Now', 5));
        }

        if (day >= 55) {
            alerts.add(makeAlert('Blue', 'Prepare Self-Check — Day 68-70',
                'Review all Must-Close Items before TL Gate.', 'Phase 3', 'Next', 20));
        }
    }

    // ── Phase 4 ──
    private static void evaluatePhase4Alerts(Onboarding__c onb, Success_Plan__c sp, Integer day, List<AlertItem> alerts) {
        if (day > 75 && onb.TL_Gate_Date__c == null) {
            alerts.add(makeAlert('Red', 'TL Gate overdue',
                'Must be completed Day 75-85. Close-Off blocked.', 'Phase 4', 'Now', 1));
        }

        if (day > 75 && onb.Review_Date__c == null) {
            alerts.add(makeAlert('Red', '90-Day Review not scheduled',
                'Day 80-90 window. Schedule immediately.', 'Phase 4', 'Now', 2));
        }

        if (day >= 68 && day <= 70 && !onb.Self_Check_Completed__c) {
            alerts.add(makeAlert('Blue', '70-Day Self-Check due',
                'Review all Must-Close Items. Internal readiness check.', 'Phase 4', 'Now', 10));
        }

        if (day >= 68 && onb.Call5_Date__c == null) {
            alerts.add(makeAlert('Blue', 'Call #5 — Pre-Review Alignment (Day 70-75)',
                'Prepare customer for 90-Day Review.', 'Phase 4', 'Next', 15));
        }
    }

    // ── Helper ──
    private static AlertItem makeAlert(String severity, String title, String description, String phase, String category, Integer sortOrder) {
        AlertItem a = new AlertItem();
        a.severity = severity;
        a.title = title;
        a.description = description;
        a.phase = phase;
        a.category = category;
        a.sortOrder = sortOrder;
        return a;
    }
}
