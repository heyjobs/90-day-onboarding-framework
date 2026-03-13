/**
 * Evaluates SLA adherence for onboarding touchpoints.
 * Reads Onboarding_SLA_Rule__mdt custom metadata for window definitions.
 */
public with sharing class OnboardingSlaService {

    public class SlaResult {
        @AuraEnabled public String touchpointName;
        @AuraEnabled public String status;        // On-Time, Late, Critical, Pending, Not Due, Due
        @AuraEnabled public Integer daysRemaining;
        @AuraEnabled public Date windowStart;
        @AuraEnabled public Date windowEnd;
        @AuraEnabled public Date completedDate;
        @AuraEnabled public String breachAction;
        @AuraEnabled public Integer sortOrder;
    }

    /**
     * Evaluate SLA for all touchpoints of an onboarding record.
     */
    @AuraEnabled(cacheable=true)
    public static List<SlaResult> evaluateSla(Id onboardingId) {
        Onboarding__c onb = [
            SELECT Id, Day0_Date__c, ACM_Assignment_Date__c,
                   IHC1_Date__c, Intro_Date__c, Kickoff_Date__c,
                   Call1_Date__c, Call2_Date__c, Call3_Date__c,
                   Call4_Date__c, Call5_Date__c, Call6_Date__c,
                   F2F_Date__c, TL_Gate_Date__c
            FROM Onboarding__c
            WHERE Id = :onboardingId
            LIMIT 1
        ];

        if (onb == null) {
            return new List<SlaResult>();
        }

        List<Onboarding_SLA_Rule__mdt> rules = [
            SELECT DeveloperName, MasterLabel,
                   Touchpoint_Name__c, Anchor_Field__c,
                   Window_Start_Offset__c, Window_End_Offset__c,
                   Unit__c, Critical_Threshold_Offset__c,
                   Date_Field__c, Breach_Action__c, Sort_Order__c
            FROM Onboarding_SLA_Rule__mdt
            ORDER BY Sort_Order__c ASC
        ];

        List<SlaResult> results = new List<SlaResult>();
        Date today = Date.today();

        for (Onboarding_SLA_Rule__mdt rule : rules) {
            SlaResult result = new SlaResult();
            result.touchpointName = rule.Touchpoint_Name__c;
            result.breachAction = rule.Breach_Action__c;
            result.sortOrder = rule.Sort_Order__c != null ? (Integer) rule.Sort_Order__c : 99;

            // Resolve anchor date
            Date anchorDate = getDateFieldValue(onb, rule.Anchor_Field__c);
            if (anchorDate == null) {
                result.status = 'Pending';
                results.add(result);
                continue;
            }

            // Calculate window dates
            Integer startOffset = rule.Window_Start_Offset__c != null ? (Integer) rule.Window_Start_Offset__c : 0;
            Integer endOffset = rule.Window_End_Offset__c != null ? (Integer) rule.Window_End_Offset__c : 0;

            if (rule.Unit__c == 'WD') {
                result.windowStart = addWorkingDays(anchorDate, startOffset);
                result.windowEnd = addWorkingDays(anchorDate, endOffset);
            } else {
                result.windowStart = anchorDate.addDays(startOffset);
                result.windowEnd = anchorDate.addDays(endOffset);
            }

            // Resolve completion date
            Date completedDate = getDateFieldValue(onb, rule.Date_Field__c);
            result.completedDate = completedDate;

            if (completedDate != null) {
                result.status = completedDate <= result.windowEnd ? 'On-Time' : 'Late';
            } else if (today < result.windowStart) {
                result.status = 'Not Due';
                result.daysRemaining = today.daysBetween(result.windowStart);
            } else if (today <= result.windowEnd) {
                result.status = 'Due';
                result.daysRemaining = today.daysBetween(result.windowEnd);
            } else {
                // Past window end — check Critical tier
                if (rule.Critical_Threshold_Offset__c != null) {
                    Integer critOffset = (Integer) rule.Critical_Threshold_Offset__c;
                    Date critDate = rule.Unit__c == 'WD'
                        ? addWorkingDays(anchorDate, critOffset)
                        : anchorDate.addDays(critOffset);
                    result.status = today > critDate ? 'Critical' : 'Late';
                } else {
                    result.status = 'Late';
                }
                result.daysRemaining = today.daysBetween(result.windowEnd); // negative
            }

            results.add(result);
        }

        return results;
    }

    /**
     * Get a date field value dynamically from an SObject.
     */
    private static Date getDateFieldValue(SObject record, String fieldApiName) {
        if (String.isBlank(fieldApiName)) return null;
        try {
            Object val = record.get(fieldApiName);
            return val != null ? (Date) val : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Compute aggregate SLA adherence score and write to Onboarding record.
     * Formula: COUNT(On-Time) / COUNT(all completed) * 100
     */
    @AuraEnabled
    public static Decimal computeAggregateSla(Id onboardingId) {
        List<SlaResult> results = evaluateSla(onboardingId);
        Integer completed = 0;
        Integer onTime = 0;
        for (SlaResult r : results) {
            if (r.completedDate != null) {
                completed++;
                if (r.status == 'On-Time') {
                    onTime++;
                }
            }
        }
        Decimal score = completed > 0 ? ((Decimal) onTime / completed * 100).setScale(0) : null;
        Onboarding__c onb = new Onboarding__c(Id = onboardingId, SLA_Adherence_Score__c = score);
        update onb;
        return score;
    }

    /**
     * Add working days (Mon-Fri) to a date.
     * Does not account for public holidays — can be enhanced with BusinessHours later.
     */
    public static Date addWorkingDays(Date startDate, Integer workingDays) {
        if (workingDays == 0) return startDate;

        Date result = startDate;
        Integer added = 0;
        Integer direction = workingDays > 0 ? 1 : -1;
        Integer absWd = Math.abs(workingDays);

        while (added < absWd) {
            result = result.addDays(direction);
            DateTime dt = DateTime.newInstance(result, Time.newInstance(0, 0, 0, 0));
            String dayName = dt.format('EEEE');
            if (dayName != 'Saturday' && dayName != 'Sunday') {
                added++;
            }
        }

        return result;
    }
}
