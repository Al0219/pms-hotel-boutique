package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.EmailSender;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="pms.security.reservation-link-otp-hmac-key=")
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class PublicReservationLookupIntegrationTests {
    private static final String SCHEMA="lookup_"+UUID.randomUUID().toString().replace("-","");
    private static final String PATH="/api/v1/public/reservation-lookup/search";
    @DynamicPropertySource static void schema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql",()->"CREATE SCHEMA IF NOT EXISTS "+SCHEMA+"; SET search_path TO "+SCHEMA);
        properties.add("spring.liquibase.default-schema",()->SCHEMA); properties.add("spring.liquibase.liquibase-schema",()->SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
    }
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json; @Autowired PublicReservationLookupService service;
    @MockitoBean EmailSender sender;
    @AfterAll void cleanup() { jdbc.execute("DROP SCHEMA "+SCHEMA+" CASCADE"); }

    @Test void emailAndCodeReturnOnlyOneReservationIncludingAllItsStaysWithoutEmailOrAccount() throws Exception {
        String email=email(); UUID[] first=booking(email,"CONFIRMED"), second=booking(email,"CANCELLED");
        booking(email(),"CONFIRMED"); stay(first[0],first[2],first[3]);
        var counts=snapshot(); String code=code(first[0]);
        search("  "+email.toUpperCase(Locale.ROOT)+"  "," "+code.toLowerCase(Locale.ROOT)+" ")
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","private, no-store"))
            .andExpect(jsonPath("$.stays.length()").value(2)).andExpect(jsonPath("$.details.length()").value(2))
            .andExpect(jsonPath("$.stays[0].reservationId").value(first[0].toString()))
            .andExpect(jsonPath("$.stays[1].reservationId").value(first[0].toString()))
            .andExpect(jsonPath("$.details[0].roomType.name").value("Lookup room"))
            .andExpect(jsonPath("$.details[0].room").isEmpty())
            .andExpect(jsonPath("$.email").doesNotExist()).andExpect(jsonPath("$.accessToken").doesNotExist())
            .andExpect(jsonPath("$.details[0].document").doesNotExist()).andExpect(jsonPath("$.details[0].notes").doesNotExist());
        assertNotEquals(first[0],second[0]);
        assertEquals(counts,snapshot(),"Reading must not change accounts/sessions/links/bookings/financial rows");
        assertEquals(0,jdbc.queryForObject("select count(*) from public_reservation_challenges",Integer.class));
        assertEquals(0,jdbc.queryForObject("select count(*) from public_reservation_access",Integer.class));
        verifyNoInteractions(sender);
    }

    @Test void historicalCancelledReservationRemainsReadableButForeignPairsAreIndistinguishable() throws Exception {
        String email=email(), foreign=email(); UUID[] own=booking(email,"CANCELLED"), other=booking(foreign,"CONFIRMED");
        search(email,code(own[0])).andExpect(status().isOk()).andExpect(jsonPath("$.stays[0].reservationStatus").value("CANCELLED"));
        String mismatch=search(email,code(other[0])).andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(mismatch,search(email(),"UNKNOWN-CODE").andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString());
        assertEquals(mismatch,search(email(),code(own[0])).andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString());
    }

    @Test void bothCredentialsAreMandatoryAndGuestStaffHeadersCannotBypassThePair() throws Exception {
        String email=email(); UUID[] own=booking(email,"CONFIRMED");
        for(String body:List.of("{}",json.writeValueAsString(Map.of("email",email)),
                json.writeValueAsString(Map.of("confirmationCode",code(own[0]))),
                json.writeValueAsString(Map.of("email","bad","confirmationCode",code(own[0]))),
                json.writeValueAsString(Map.of("email",email,"confirmationCode",code(own[0]),"accountId",UUID.randomUUID())),
                " ".repeat(2049))) {
            mvc.perform(post(PATH).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(post(PATH).header("Authorization","Bearer synthetic.staff.or.guest.jwt")
            .contentType("application/json").content(json.writeValueAsString(Map.of("email",email(),"confirmationCode",code(own[0])))))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/guest-auth/account/reservations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/staff-auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void failuresAccumulatePerEmailEvenWhenReferencesChange() throws Exception {
        String email=email(); UUID[] own=booking(email,"CONFIRMED");
        int before=jdbc.queryForObject("select count(*) from public_reservation_queries where outcome='MISS'",Integer.class);
        for(int n=0;n<5;n++) search(email,"WRONG-CODE-"+n).andExpect(status().isNotFound());
        search(email,code(own[0])).andExpect(status().isTooManyRequests());
        assertEquals(before+5,jdbc.queryForObject("select count(*) from public_reservation_queries where outcome='MISS'",Integer.class));
    }

    @Test void failuresAccumulatePerReferenceEvenWhenEmailsChange() throws Exception {
        String email=email(); UUID[] own=booking(email,"CONFIRMED"); String code=code(own[0]);
        for(int n=0;n<5;n++) search(email(),code).andExpect(status().isNotFound());
        search(email,code).andExpect(status().isTooManyRequests());
    }

    @Test void successfulReadsAreAlsoBoundedAndAuditCannotBeChangedOrDeleted() throws Exception {
        String email=email(); UUID[] own=booking(email,"CONFIRMED"); String code=code(own[0]);
        for(int n=0;n<10;n++) search(email,code).andExpect(status().isOk());
        search(email,code).andExpect(status().isTooManyRequests());
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("delete from public_reservation_queries"));
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("update public_reservation_queries set outcome='MISS'"));
    }

    @Test void concurrentMissesCannotExceedBudgetAndNoRawCredentialsAreAudited() throws Exception {
        String email=email(), code="UNKNOWN-"+UUID.randomUUID().toString().substring(0,8).toUpperCase(Locale.ROOT);
        try(var workers=Executors.newFixedThreadPool(6)) {
            List<Callable<Integer>> calls=new ArrayList<>();
            for(int n=0;n<6;n++) calls.add(()->{
                try { service.search(email,code); return 200; } catch(PublicReservationLookupException failure) { return failure.status(); }
            });
            List<Integer> statuses=new ArrayList<>();
            for(var result:workers.invokeAll(calls)) statuses.add(result.get(15,TimeUnit.SECONDS));
            assertEquals(5,Collections.frequency(statuses,404)); assertEquals(1,Collections.frequency(statuses,429));
        }
        String audits=jdbc.queryForObject("select coalesce(string_agg(row_to_json(q)::text,''),'') from public_reservation_queries q",String.class);
        assertFalse(audits.contains(email)); assertFalse(audits.contains(code));
    }

    @Test void originalConfirmationTotalAndTypeCodesAreScopedWithoutCurrentRatesOrPaymentData() throws Exception {
        String email=email(); UUID[] own=booking(email,"CONFIRMED"), other=booking(email,"CONFIRMED");
        receipt(own,65000); receipt(other,99000); var before=snapshot();
        search(email,code(own[0])).andExpect(status().isOk())
            .andExpect(jsonPath("$.overview.currency").value("GTQ"))
            .andExpect(jsonPath("$.overview.confirmedTotalMinor").value(65000))
            .andExpect(jsonPath("$.overview.createdAt").isNotEmpty())
            .andExpect(jsonPath("$.accommodations[0].stayId").value(own[1].toString()))
            .andExpect(jsonPath("$.accommodations[0].roomTypeCode").value(own[3].toString()))
            .andExpect(jsonPath("$.accommodations[0].timezone").isNotEmpty())
            .andExpect(jsonPath("$.overview.payment").doesNotExist())
            .andExpect(jsonPath("$.overview.balance").doesNotExist())
            .andExpect(jsonPath("$.overview.guestName").doesNotExist());
        assertEquals(before,snapshot()); verifyNoInteractions(sender);
    }
    @Test void missingOrIncoherentCurrencyReceiptsNeverBecomeZeroOrNewCatalogQuotes() throws Exception {
        String email=email(); UUID[] own=booking(email,"CONFIRMED");
        search(email,code(own[0])).andExpect(status().isOk()).andExpect(jsonPath("$.overview.confirmedTotalMinor").isEmpty());
        receipt(own,65000);
        jdbc.update("update reservations set currency='USD' where id=?",own[0]);
        search(email,code(own[0])).andExpect(status().isOk()).andExpect(jsonPath("$.overview.currency").value("USD"))
            .andExpect(jsonPath("$.overview.confirmedTotalMinor").isEmpty());
    }
    private void receipt(UUID[] booking,long total) {
        var response=new com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingView(
            booking[0],code(booking[0]),"CONFIRMED","GTQ",total,
            new com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingView.PaymentView("SIMULATED","APPROVED","lookup-payment-"+booking[0]),
            List.of(new com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingView.StayView(booking[1],booking[3],null,java.time.LocalDate.of(2036,1,1),java.time.LocalDate.of(2036,1,3))));
        jdbc.update("insert into public_booking_receipts(idempotency_key,request_hash,status,reservation_id,confirmation_code,payment_reference,response_snapshot,created_at,updated_at) values(?,repeat('a',64),'COMPLETED',?,?,?,?::jsonb,now(),now())",
            "lookup-"+UUID.randomUUID(),booking[0],code(booking[0]),response.payment().reference(),json.writeValueAsString(response));
    }
    private org.springframework.test.web.servlet.ResultActions search(String email,String code) throws Exception {
        return mvc.perform(post(PATH).contentType("application/json").content(json.writeValueAsString(Map.of("email",email,"confirmationCode",code))));
    }
    private String email() { return UUID.randomUUID()+"@example.test"; }
    private String code(UUID id) { return jdbc.queryForObject("select confirmation_code from reservations where id=?",String.class,id); }
    private List<String> snapshot() {
        return List.of("guest_accounts","guest_auth_sessions","guest_reservation_links","reservations","reservation_stays","folio_movements")
            .stream().map(table->jdbc.queryForObject("select coalesce(md5(string_agg(row_to_json(t)::text,'' order by row_to_json(t)::text)),'') from "+table+" t",String.class)).toList();
    }
    private UUID[] booking(String email,String status) {
        UUID profile=UUID.randomUUID(), reservation=UUID.randomUUID(), type=UUID.randomUUID();
        UUID property=jdbc.queryForObject("select id from properties order by id limit 1",UUID.class);
        jdbc.update("insert into guest_profiles(id,first_name,last_name,email,status,created_at,updated_at) values(?,'Lookup','Guest',?,'ACTIVE',now(),now())",profile,email);
        jdbc.update("insert into room_types(id,property_id,code,name) values(?,?,?,'Lookup room')",type,property,type.toString());
        jdbc.update("insert into reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) values(?,?,?,?,?,'GTQ','WEB_DIRECTA',now(),now())",reservation,property,profile,reservation.toString().substring(0,16).toUpperCase(Locale.ROOT),status);
        return new UUID[]{reservation,stay(reservation,property,type),property,type};
    }
    private UUID stay(UUID reservation,UUID property,UUID type) {
        UUID id=UUID.randomUUID(); jdbc.update("insert into reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) values(?,?,?,?,'2036-01-01','2036-01-03','RESERVED',now(),now())",id,reservation,property,type); return id;
    }
}
