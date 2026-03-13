/**
 * Test class for OnboardingController, OnboardingSlaService, and OnboardingAlertService.
 */
@IsTest
private class OnboardingControllerTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Onboarding Account');
        insert acc;

        Success_Plan__c sp = new Success_Plan__c(
            Account__c = acc.Id,
            Customer_Goal__c = 'Test goal: 3 hires/Q',
            Health_Status__c = 'Green',
            O_Min_Status__c = 'Pending'
        );
        insert sp;

        Onboarding__c onb = new Onboarding__c(
            Account__c = acc.Id,
            Success_Plan__c = sp.Id,
            ACM_Assignment_Date__c = Date.today().addDays(-20),
            Day0_Date__c = Date.today().addDays(-18),
            IHC1_Date__c = Date.today().addDays(-19),
            Intro_Date__c = Date.today().addDays(-18),
            Kickoff_Date__c = Date.today().addDays(-15),
            Activation_Confirmed__c = true,
            AE_Handover_Reviewed__c = true,
            Customer_Context_Validated__c = true,
            Tech_Setup_Path_Confirmed__c = true,
            ATS_Case_Opened__c = true,
            Ownership_Next_Steps_Clear__c = true
        );
        insert onb;

        sp.Onboarding__c = onb.Id;
        update sp;
    }

    // ── OnboardingController Tests ──

    @IsTest
    static void testGetOnboarding() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Onboarding Account' LIMIT 1];

        Test.startTest();
        Onboarding__c result = OnboardingController.getOnboarding(acc.Id);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should return onboarding record');
        System.assertEquals(acc.Id, result.Account__c);
        System.assertEquals(true, result.Gate_1_Validated__c, 'Gate 1 should be validated');
    }

    @IsTest
    static void testGetOnboardingNoRecord() {
        Account acc = new Account(Name = 'Empty Account');
        insert acc;

        Test.startTest();
        Onboarding__c result = OnboardingController.getOnboarding(acc.Id);
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null for account without onboarding');
    }

    @IsTest
    static void testGetSuccessPlan() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Onboarding Account' LIMIT 1];

        Test.startTest();
        Success_Plan__c result = OnboardingController.getSuccessPlan(acc.Id);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should return success plan');
        System.assertEquals('Test goal: 3 hires/Q', result.Customer_Goal__c);
    }

    @IsTest
    static void testSaveOnboarding() {
        Onboarding__c onb = [SELECT Id FROM Onboarding__c LIMIT 1];

        Map<String, Object> fields = new Map<String, Object>{
            'Health_Status_Final__c' => 'Yellow',
            'F2F_Format__c' => 'In-Person'
        };

        Test.startTest();
        Onboarding__c result = OnboardingController.saveOnboarding(onb.Id, fields);
        Test.stopTest();

        System.assertEquals('Yellow', result.Health_Status_Final__c);
    }

    @IsTest
    static void testSaveSuccessPlan() {
        Success_Plan__c sp = [SELECT Id FROM Success_Plan__c LIMIT 1];

        Map<String, Object> fields = new Map<String, Object>{
            'Health_Status__c' => 'Yellow',
            'Health_Yellow_Comment__c' => 'ATS integration delayed'
        };

        Test.startTest();
        Success_Plan__c result = OnboardingController.saveSuccessPlan(sp.Id, fields);
        Test.stopTest();

        System.assertEquals('Yellow', result.Health_Status__c);
        System.assertEquals('ATS integration delayed', result.Health_Yellow_Comment__c);
    }

    @IsTest
    static void testCreateOnboarding() {
        Account acc = new Account(Name = 'New Account for Onboarding');
        insert acc;

        Test.startTest();
        Onboarding__c result = OnboardingController.createOnboarding(acc.Id);
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertNotEquals(null, result.Success_Plan__c, 'Should have linked Success Plan');
        System.assertEquals(Date.today(), result.ACM_Assignment_Date__c);
    }

    @IsTest
    static void testCreateOnboardingDuplicate() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Onboarding Account' LIMIT 1];

        Test.startTest();
        try {
            OnboardingController.createOnboarding(acc.Id);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('already exists'));
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetAdditionalTouchpoints() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Onboarding Account' LIMIT 1];

        Event evt = new Event(
            Subject = 'Ad-hoc Check-in',
            StartDateTime = Datetime.now().addDays(5),
            EndDateTime = Datetime.now().addDays(5).addMinutes(30),
            DurationInMinutes = 30,
            Onboarding_Touchpoint_Type__c = 'Ad-hoc Call',
            Onboarding_Phase__c = 'Phase 1',
            WhatId = acc.Id
        );
        insert evt;

        Test.startTest();
        List<Event> results = OnboardingController.getAdditionalTouchpoints(acc.Id);
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return 1 additional touchpoint');
        System.assertEquals('Ad-hoc Check-in', results[0].Subject);
    }

    @IsTest
    static void testCreateAdditionalTouchpoint() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Onboarding Account' LIMIT 1];

        Test.startTest();
        Event result = OnboardingController.createAdditionalTouchpoint(
            acc.Id, 'Escalation Call', Datetime.now().addDays(3), 45,
            'Escalation', 'Phase 2', 'Urgent issue follow-up'
        );
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals('Escalation Call', result.Subject);
        System.assertEquals('Escalation', result.Onboarding_Touchpoint_Type__c);
        System.assertEquals('Phase 2', result.Onboarding_Phase__c);
        System.assertEquals(45, result.DurationInMinutes);
    }

    @IsTest
    static void testGetAdditionalTouchpointsEmpty() {
        Account acc = new Account(Name = 'No Events Account');
        insert acc;

        Test.startTest();
        List<Event> results = OnboardingController.getAdditionalTouchpoints(acc.Id);
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Should return empty list');
    }

    @IsTest
    static void testComputeAggregateSla() {
        Onboarding__c onb = [SELECT Id FROM Onboarding__c LIMIT 1];

        Test.startTest();
        Decimal score = OnboardingSlaService.computeAggregateSla(onb.Id);
        Test.stopTest();

        // IHC#1, Intro, Kickoff are completed in test data — score should be non-null
        System.assertNotEquals(null, score, 'Aggregate SLA score should be computed');
        System.assert(score >= 0 && score <= 100, 'Score should be between 0 and 100: ' + score);

        // Verify field was written
        Onboarding__c updated = [SELECT SLA_Adherence_Score__c FROM Onboarding__c WHERE Id = :onb.Id];
        System.assertEquals(score, updated.SLA_Adherence_Score__c);
    }

    @IsTest
    static void testComputeAggregateSlaNoCompleted() {
        Account acc = new Account(Name = 'No Touchpoints Account');
        insert acc;
        Success_Plan__c sp = new Success_Plan__c(Account__c = acc.Id);
        insert sp;
        Onboarding__c onb = new Onboarding__c(
            Account__c = acc.Id,
            Success_Plan__c = sp.Id,
            ACM_Assignment_Date__c = Date.today()
        );
        insert onb;

        Test.startTest();
        Decimal score = OnboardingSlaService.computeAggregateSla(onb.Id);
        Test.stopTest();

        System.assertEquals(null, score, 'Score should be null when no touchpoints completed');
    }

    // ── OnboardingSlaService Tests ──

    @IsTest
    static void testEvaluateSla() {
        Onboarding__c onb = [SELECT Id FROM Onboarding__c LIMIT 1];

        Test.startTest();
        List<OnboardingSlaService.SlaResult> results = OnboardingSlaService.evaluateSla(onb.Id);
        Test.stopTest();

        System.assert(results.size() > 0, 'Should return SLA results from custom metadata');
        // IHC #1 should be On-Time (date was set 19 days ago, within 2 WD of assignment)
        for (OnboardingSlaService.SlaResult r : results) {
            System.assertNotEquals(null, r.status, 'Each result should have a status');
        }
    }

    @IsTest
    static void testEvaluateSlaNoRecord() {
        // Use a fake Id
        Test.startTest();
        try {
            List<OnboardingSlaService.SlaResult> results = OnboardingSlaService.evaluateSla(null);
        } catch (Exception e) {
            // Expected — null Id
        }
        Test.stopTest();
    }

    @IsTest
    static void testAddWorkingDays() {
        // Monday 2026-03-09
        Date monday = Date.newInstance(2026, 3, 9);

        Test.startTest();
        Date plus5 = OnboardingSlaService.addWorkingDays(monday, 5);
        Date plus0 = OnboardingSlaService.addWorkingDays(monday, 0);
        Date plus1 = OnboardingSlaService.addWorkingDays(monday, 1);
        Test.stopTest();

        // 5 WD from Monday = next Monday
        System.assertEquals(Date.newInstance(2026, 3, 16), plus5, '5 WD from Monday should be next Monday');
        System.assertEquals(monday, plus0, '0 WD should return same date');
        System.assertEquals(Date.newInstance(2026, 3, 10), plus1, '1 WD from Monday should be Tuesday');
    }

    // ── OnboardingAlertService Tests ──

    @IsTest
    static void testGetAlerts() {
        Onboarding__c onb = [SELECT Id FROM Onboarding__c LIMIT 1];

        Test.startTest();
        List<OnboardingAlertService.AlertItem> alerts = OnboardingAlertService.getAlerts(onb.Id);
        Test.stopTest();

        System.assertNotEquals(null, alerts, 'Should return alerts list');
        // With Day0 18 days ago and Phase 2, should get some alerts
    }

    @IsTest
    static void testGetAlertsPrePhase() {
        // Create an onboarding in pre-phase (no Day0)
        Account acc = new Account(Name = 'PrePhase Account');
        insert acc;

        Success_Plan__c sp = new Success_Plan__c(Account__c = acc.Id);
        insert sp;

        Onboarding__c onb = new Onboarding__c(
            Account__c = acc.Id,
            Success_Plan__c = sp.Id,
            ACM_Assignment_Date__c = Date.today(),
            IHC1_Date__c = Date.today()
            // No Day0 — should be Pre-Phase
        );
        insert onb;

        Test.startTest();
        List<OnboardingAlertService.AlertItem> alerts = OnboardingAlertService.getAlerts(onb.Id);
        Test.stopTest();

        // Should get "Contact customer by phone" alert (IHC done, no intro)
        Boolean foundContactAlert = false;
        for (OnboardingAlertService.AlertItem a : alerts) {
            if (a.title != null && a.title.contains('Contact customer')) {
                foundContactAlert = true;
            }
        }
        System.assert(foundContactAlert, 'Should have contact customer alert in pre-phase');
    }

    @IsTest
    static void testAlertSorting() {
        // Test that alerts sort correctly: Red > Amber > Blue > Green, Now > Next
        OnboardingAlertService.AlertItem red = new OnboardingAlertService.AlertItem();
        red.severity = 'Red'; red.category = 'Now'; red.sortOrder = 1;

        OnboardingAlertService.AlertItem blue = new OnboardingAlertService.AlertItem();
        blue.severity = 'Blue'; blue.category = 'Now'; blue.sortOrder = 1;

        OnboardingAlertService.AlertItem amberNext = new OnboardingAlertService.AlertItem();
        amberNext.severity = 'Amber'; amberNext.category = 'Next'; amberNext.sortOrder = 1;

        List<OnboardingAlertService.AlertItem> items = new List<OnboardingAlertService.AlertItem>{
            blue, amberNext, red
        };
        items.sort();

        System.assertEquals('Red', items[0].severity, 'Red should be first');
        System.assertEquals('Amber', items[1].severity, 'Amber should be second');
        System.assertEquals('Blue', items[2].severity, 'Blue should be third');
    }
}
