import { describe, it, expect } from "vitest";
import {
  CallStateMachine,
  type CallStateMachineState,
  RING_TIMEOUT_MS,
  RECONNECT_TIMEOUT_MS,
  E2EE6_PROTOCOL_VERSION,
} from "@/lib/e2ee/e2ee-call-signaling";

describe("CallStateMachine (E2EE-6 Lifecycle)", () => {
  it("initializes with IDLE state by default", () => {
    const sm = new CallStateMachine();
    expect(sm.state).toBe("IDLE");
  });

  it("supports custom initial state in constructor", () => {
    const sm = new CallStateMachine("RINGING");
    expect(sm.state).toBe("RINGING");
  });

  it("exposes expected protocol constants and timeouts", () => {
    expect(E2EE6_PROTOCOL_VERSION).toBe("e2ee-6-v1");
    expect(RING_TIMEOUT_MS).toBe(35_000);
    expect(RECONNECT_TIMEOUT_MS).toBe(15_000);
  });

  describe("Outgoing Call Progression", () => {
    it("transitions through full successful outgoing call lifecycle", () => {
      const sm = new CallStateMachine();
      expect(sm.state).toBe("IDLE");

      // Caller places call
      sm.transitionTo("OUTGOING");
      expect(sm.state).toBe("OUTGOING");

      // Peer answers, DTLS negotiation starts
      sm.transitionTo("CONNECTING");
      expect(sm.state).toBe("CONNECTING");

      // Media stream connected
      sm.transitionTo("CONNECTED");
      expect(sm.state).toBe("CONNECTED");

      // Network blip / ICE restart
      sm.transitionTo("RECONNECTING");
      expect(sm.state).toBe("RECONNECTING");

      // Recovered
      sm.transitionTo("CONNECTED");
      expect(sm.state).toBe("CONNECTED");

      // Call finished
      sm.transitionTo("ENDED");
      expect(sm.state).toBe("ENDED");

      // Back to idle
      sm.transitionTo("IDLE");
      expect(sm.state).toBe("IDLE");
    });

    it("transitions from OUTGOING to MISSED if ring timeout expires", () => {
      const sm = new CallStateMachine("OUTGOING");
      sm.transitionTo("MISSED");
      expect(sm.state).toBe("MISSED");
      sm.transitionTo("IDLE");
      expect(sm.state).toBe("IDLE");
    });

    it("transitions from OUTGOING to FAILED if peer network error occurs", () => {
      const sm = new CallStateMachine("OUTGOING");
      sm.transitionTo("FAILED");
      expect(sm.state).toBe("FAILED");
      sm.transitionTo("IDLE");
      expect(sm.state).toBe("IDLE");
    });
  });

  describe("Incoming Call Progression", () => {
    it("transitions through incoming call acceptance", () => {
      const sm = new CallStateMachine();
      sm.transitionTo("RINGING");
      expect(sm.state).toBe("RINGING");

      sm.transitionTo("CONNECTING");
      expect(sm.state).toBe("CONNECTING");

      sm.transitionTo("CONNECTED");
      expect(sm.state).toBe("CONNECTED");

      sm.transitionTo("ENDED");
      expect(sm.state).toBe("ENDED");
    });

    it("transitions from RINGING to DECLINED upon callee rejection", () => {
      const sm = new CallStateMachine("RINGING");
      sm.transitionTo("DECLINED");
      expect(sm.state).toBe("DECLINED");

      sm.transitionTo("IDLE");
      expect(sm.state).toBe("IDLE");
    });

    it("transitions from RINGING to IDLE if caller cancels before answer", () => {
      const sm = new CallStateMachine("RINGING");
      sm.transitionTo("IDLE");
      expect(sm.state).toBe("IDLE");
    });
  });

  describe("Illegal Transition Enforcement", () => {
    it("rejects illegal jump from IDLE directly to CONNECTED", () => {
      const sm = new CallStateMachine("IDLE");
      expect(sm.canTransitionTo("CONNECTED")).toBe(false);
      expect(() => sm.transitionTo("CONNECTED")).toThrow("Illegal call state transition: IDLE -> CONNECTED");
    });

    it("rejects illegal jump from RINGING directly to RECONNECTING", () => {
      const sm = new CallStateMachine("RINGING");
      expect(sm.canTransitionTo("RECONNECTING")).toBe(false);
      expect(() => sm.transitionTo("RECONNECTING")).toThrow("Illegal call state transition: RINGING -> RECONNECTING");
    });

    it("rejects illegal jump from ENDED directly to CONNECTED", () => {
      const sm = new CallStateMachine("ENDED");
      expect(sm.canTransitionTo("CONNECTED")).toBe(false);
      expect(() => sm.transitionTo("CONNECTED")).toThrow("Illegal call state transition: ENDED -> CONNECTED");
    });

    it("allows idempotent transition to current state without throwing", () => {
      const sm = new CallStateMachine("CONNECTED");
      expect(sm.canTransitionTo("CONNECTED")).toBe(true);
      expect(() => sm.transitionTo("CONNECTED")).not.toThrow();
      expect(sm.state).toBe("CONNECTED");
    });

    it("resets directly back to IDLE via reset() method", () => {
      const sm = new CallStateMachine("CONNECTED");
      sm.reset();
      expect(sm.state).toBe("IDLE");
    });
  });
});
