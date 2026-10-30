package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;

class CancellationPenaltyTests {
    @ParameterizedTest
    @CsvSource({"100000,40000,10000,-30000,0,30000","100000,5000,10000,5000,5000,0",
            "100000,0,10000,10000,10000,0","100000,100000,10000,-90000,0,90000",
            "100005,0,10001,10001,10001,0","100004,0,10000,10000,10000,0",
            "5,0,1,1,1,0","4,0,0,0,0,0"})
    void exactTenPercentRetainsCreditOrDebtAndRoundsOnlyOnce(long base,long paid,long penalty,long balance,long due,long credit) {
        var result=StaffReservationCancellationService.calculate(UUID.randomUUID(),"GTQ",base,paid);
        assertEquals(penalty,result.penaltyMinor()); assertEquals(balance,result.balanceAfterMinor());
        assertEquals(due,result.dueMinor()); assertEquals(credit,result.creditMinor());
        assertEquals(base,result.accommodationMinor()); assertEquals(paid,result.paidMinor());
        assertEquals("GTQ",result.currency());
    }
    @ParameterizedTest
    @CsvSource({"0,0","-1,0","1,-1","9007199254740992,0","100,9007199254740992"})
    void unverifiableOrUnsafeAmountsAreBlocked(long base,long paid) {
        assertThrows(StaffReservationCancellationService.Conflict.class,
                () -> StaffReservationCancellationService.calculate(UUID.randomUUID(),"GTQ",base,paid));
    }
}
