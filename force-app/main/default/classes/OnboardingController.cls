/**
 * Main controller for 90-Day Onboarding LWC components.
 * Provides CRUD operations for Onboarding__c and Success_Plan__c records.
 */
public with sharing class OnboardingController {

    // ── Field lists (reused across queries) ──
    private static final String ONB_FIELDS = String.join(new List<String>{
        'Id', 'Name', 'Account__c', 'Contact__c', 'Opportunity__c',
        'Day0_Date__c', 'ACM_Assignment_Date__c', 'Close_Off_Date__c',
        'Current_Day__c', 'Current_Phase__c',
        'AE_Handover_Reviewed__c', 'Customer_Context_Validated__c',
        'Tech_Setup_Path_Confirmed__c', 'ATS_Case_Opened__c',
        'Ownership_Next_Steps_Clear__c', 'Gate_1_Validated__c',
        'Kickoff_Date_Tentative__c',
        'Support_Channels_Explained__c', 'Touchpoint_Calendar_Set__c',
        'Intro_Warm_Intro_Done__c', 'Intro_Journey_Preview_Done__c',
        'Intro_Kickoff_Aligned__c', 'Intro_Followup_Sent__c',
        'IHC1_Date__c', 'Intro_Date__c', 'Kickoff_Date__c',
        'Call1_Date__c', 'Call2_Date__c', 'Call3_Date__c',
        'Call4_Date__c', 'Call5_Date__c', 'Call6_Date__c',
        'F2F_Date__c', 'TL_Gate_Date__c', 'Self_Check_Date__c',
        'Activation_Confirmed__c', 'F2F_Format__c',
        'Health_Status_Final__c', 'TL_Gate_Result__c',
        'TL_Gate_Readiness__c', 'Self_Check_Completed__c',
        'Review_Date__c', 'Review_Format__c', 'Review_SS_Confirmed__c',
        'Onboarding_Satisfaction_Score__c',
        'SLA_Adherence_Score__c', 'Success_Plan__c',
        'Segment__c', 'Onboarding_Medium__c'
    }, ', ');

    private static final String SP_FIELDS = String.join(new List<String>{
        'Id', 'Name', 'Account__c', 'Onboarding__c',
        'Primary_Operator__c', 'Primary_Operator__r.Name',
        'Senior_Stakeholder__c', 'Senior_Stakeholder__r.Name',
        'Customer_Goal__c', 'Customer_Goal_Confirmed__c',
        'Health_Status__c', 'O_Min_Status__c',
        'Performance_Signal__c', 'Expectation_Delta__c',
        'Operator_Sentiment__c', 'Operator_Availability__c',
        'SS_Engagement_Status__c',
        'Operational_Maturity__c', 'Expansion_Signals__c',
        'Next_Step_Signal__c', 'Operating_Model__c',
        'KPI_Draft__c', 'Next_Step_Recommendation__c',
        'Budget_Timeline__c', 'Recruiting_Process_E2E__c',
        'Internal_Dynamics__c', 'Org_Picture__c',
        'Long_Term_View__c', 'Adoption_Gap_Analysis__c',
        'Forward_Planning__c', 'Results_ROI__c',
        'Campaign_Feedback__c', 'Quick_Wins__c',
        'Initial_Risk_Assessment__c',
        'O_Min_Gaps__c', 'Goal_Reconnect_Notes__c',
        'Performance_Review_Notes__c',
        'Relationship_Context_Check__c', 'Performance_vs_Goal__c',
        'SS_Alignment__c', 'Open_Items_F2F__c',
        'Progress_vs_Goals__c', 'Open_Items_Closed__c',
        'ATS_Setup_Path__c', 'ATS_Integration_ETA__c',
        'Blockers_Open_Items__c', 'Early_Go_Live_Decision__c',
        'SS_Present_at_F2F__c', 'Risks_Mitigation__c',
        'Health_Yellow_Comment__c', 'Health_Red_Comment__c',
        'O_Min_Not_Reached_Comment__c',
        'Performance_Down_Comment__c',
        'Expectation_Below_Comment__c',
        'Next_Step_Risk_Comment__c'
    }, ', ');

    /**
     * Get the Onboarding record for an Account.
     */
    @AuraEnabled(cacheable=true)
    public static Onboarding__c getOnboarding(Id accountId) {
        String query = 'SELECT ' + ONB_FIELDS +
            ' FROM Onboarding__c WHERE Account__c = :accountId ORDER BY CreatedDate DESC LIMIT 1';
        List<Onboarding__c> records = Database.query(query);
        return records.isEmpty() ? null : records[0];
    }

    /**
     * Get the Success Plan for an Account.
     */
    @AuraEnabled(cacheable=true)
    public static Success_Plan__c getSuccessPlan(Id accountId) {
        String query = 'SELECT ' + SP_FIELDS +
            ' FROM Success_Plan__c WHERE Account__c = :accountId ORDER BY CreatedDate DESC LIMIT 1';
        List<Success_Plan__c> records = Database.query(query);
        return records.isEmpty() ? null : records[0];
    }

    /**
     * Save (update) an Onboarding record.
     */
    @AuraEnabled
    public static Onboarding__c saveOnboarding(Id recordId, Map<String, Object> fields) {
        Onboarding__c record = new Onboarding__c(Id = recordId);
        for (String fieldName : fields.keySet()) {
            record.put(fieldName, fields.get(fieldName));
        }
        update record;
        // Recompute aggregate SLA score after saving touchpoint dates
        OnboardingSlaService.computeAggregateSla(recordId);
        String query = 'SELECT ' + ONB_FIELDS +
            ' FROM Onboarding__c WHERE Id = :recordId LIMIT 1';
        return Database.query(query);
    }

    /**
     * Save (update) a Success Plan record.
     */
    @AuraEnabled
    public static Success_Plan__c saveSuccessPlan(Id recordId, Map<String, Object> fields) {
        Success_Plan__c record = new Success_Plan__c(Id = recordId);
        for (String fieldName : fields.keySet()) {
            record.put(fieldName, fields.get(fieldName));
        }
        update record;
        String query = 'SELECT ' + SP_FIELDS +
            ' FROM Success_Plan__c WHERE Id = :recordId LIMIT 1';
        return Database.query(query);
    }

    /**
     * Get additional touchpoints (Events) for an Account's onboarding.
     */
    @AuraEnabled(cacheable=true)
    public static List<Event> getAdditionalTouchpoints(Id accountId) {
        return [
            SELECT Id, Subject, StartDateTime, EndDateTime, DurationInMinutes,
                   Description, Onboarding_Touchpoint_Type__c, Onboarding_Phase__c
            FROM Event
            WHERE AccountId = :accountId
              AND Onboarding_Touchpoint_Type__c != null
            ORDER BY StartDateTime ASC
        ];
    }

    /**
     * Create an additional touchpoint as a Salesforce Event.
     */
    @AuraEnabled
    public static Event createAdditionalTouchpoint(Id accountId, String subject,
            Datetime startDateTime, Integer durationMinutes,
            String touchpointType, String phase, String notes) {
        Event evt = new Event(
            Subject = subject,
            StartDateTime = startDateTime,
            EndDateTime = startDateTime.addMinutes(durationMinutes != null ? durationMinutes : 30),
            DurationInMinutes = durationMinutes != null ? durationMinutes : 30,
            Description = notes,
            Onboarding_Touchpoint_Type__c = touchpointType,
            Onboarding_Phase__c = phase,
            WhatId = accountId
        );
        insert evt;
        return [SELECT Id, Subject, StartDateTime, EndDateTime, DurationInMinutes,
                       Description, Onboarding_Touchpoint_Type__c, Onboarding_Phase__c
                FROM Event WHERE Id = :evt.Id LIMIT 1];
    }

    /**
     * Get the Pilot Handover ACM task for an Account.
     */
    @AuraEnabled(cacheable=true)
    public static Task getPilotHandoverTask(Id accountId) {
        List<Task> tasks = [
            SELECT Id, Subject, Status, Type, CreatedDate, ActivityDate,
                   CompletedDateTime
            FROM Task
            WHERE AccountId = :accountId
              AND Type = 'Pilot Handover ACM'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        return tasks.isEmpty() ? null : tasks[0];
    }

    /**
     * Get the Customer_360 Pilot Handover record for an Account.
     */
    @AuraEnabled(cacheable=true)
    public static Customer_360__c getCustomer360Handover(Id accountId) {
        List<Customer_360__c> records = [
            SELECT Id, Name, Type__c, Documentation_Status__c,
                   Timestamp_Documentation_Completed__c,
                   Handover_Documentation_Quality__c,
                   Handover_Quality_Comments__c,
                   ACM_Assignment_Date__c
            FROM Customer_360__c
            WHERE Account__c = :accountId
              AND Type__c = 'Pilot Handover'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        return records.isEmpty() ? null : records[0];
    }

    /**
     * Get the ATS New Onboarding case for an Account.
     */
    @AuraEnabled(cacheable=true)
    public static Case getAtsOnboardingCase(Id accountId) {
        List<Case> cases = [
            SELECT Id, CaseNumber, Subject, Status, Priority,
                   CreatedDate, ClosedDate, OwnerId, Owner.Name,
                   Integration_Type__c,
                   RecordType.Name
            FROM Case
            WHERE AccountId = :accountId
              AND RecordType.DeveloperName = 'ATS_New_Onboarding'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        return cases.isEmpty() ? null : cases[0];
    }

    /**
     * Create an Onboarding + Success Plan pair for an Account.
     */
    @AuraEnabled
    public static Onboarding__c createOnboarding(Id accountId) {
        // Check for existing
        Onboarding__c existing = getOnboarding(accountId);
        if (existing != null) {
            throw new AuraHandledException('An onboarding record already exists for this account.');
        }

        // Create Success Plan first
        Success_Plan__c sp = new Success_Plan__c(Account__c = accountId);
        insert sp;

        // Create Onboarding linked to Success Plan
        Onboarding__c onb = new Onboarding__c(
            Account__c = accountId,
            Success_Plan__c = sp.Id,
            ACM_Assignment_Date__c = Date.today()
        );
        insert onb;

        // Link Success Plan back
        sp.Onboarding__c = onb.Id;
        update sp;

        Id recordId = onb.Id;
        String query = 'SELECT ' + ONB_FIELDS +
            ' FROM Onboarding__c WHERE Id = :recordId LIMIT 1';
        return Database.query(query);
    }
}
