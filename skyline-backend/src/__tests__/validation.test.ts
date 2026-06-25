import { Validators, validateFields } from "../lib/validation";

describe("Validators.rwandaPhone", () => {
  it("accepts +250 prefix", () => {
    expect(Validators.rwandaPhone("+250788000000")).toBe(true);
  });
  it("accepts 07x prefix", () => {
    expect(Validators.rwandaPhone("0722000000")).toBe(true);
    expect(Validators.rwandaPhone("0782000000")).toBe(true);
    expect(Validators.rwandaPhone("0792000000")).toBe(true);
  });
  it("rejects wrong network prefix", () => {
    expect(Validators.rwandaPhone("0712000000")).toBe(false);
  });
  it("rejects too-short number", () => {
    expect(Validators.rwandaPhone("078200000")).toBe(false);
  });
  it("strips spaces before validating", () => {
    expect(Validators.rwandaPhone("+250 788 000 000")).toBe(true);
  });
});

describe("Validators.russianPhone", () => {
  it("accepts +7 prefix", () => {
    expect(Validators.russianPhone("+79161234567")).toBe(true);
  });
  it("accepts 8 prefix", () => {
    expect(Validators.russianPhone("89161234567")).toBe(true);
  });
  it("strips dashes and parens", () => {
    expect(Validators.russianPhone("+7(916)123-45-67")).toBe(true);
  });
  it("rejects non-numeric garbage", () => {
    expect(Validators.russianPhone("not-a-phone")).toBe(false);
  });
});

describe("Validators.email", () => {
  it("accepts valid email", () => {
    expect(Validators.email("user@example.com")).toBe(true);
  });
  it("rejects missing @", () => {
    expect(Validators.email("userexample.com")).toBe(false);
  });
  it("rejects missing domain", () => {
    expect(Validators.email("user@")).toBe(false);
  });
});

describe("Validators.uuid", () => {
  it("accepts lowercase UUID v4", () => {
    expect(Validators.uuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
  it("accepts uppercase UUID", () => {
    expect(Validators.uuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });
  it("rejects malformed UUID", () => {
    expect(Validators.uuid("not-a-uuid")).toBe(false);
  });
});

describe("Validators.positiveNumber", () => {
  it("accepts positive integer", () => expect(Validators.positiveNumber(1)).toBe(true));
  it("accepts positive decimal", () => expect(Validators.positiveNumber(0.01)).toBe(true));
  it("rejects zero", () => expect(Validators.positiveNumber(0)).toBe(false));
  it("rejects negative", () => expect(Validators.positiveNumber(-5)).toBe(false));
  it("rejects Infinity", () => expect(Validators.positiveNumber(Infinity)).toBe(false));
  it("rejects NaN", () => expect(Validators.positiveNumber(NaN)).toBe(false));
});

describe("Validators.amountInRange", () => {
  it("accepts value at min boundary", () => expect(Validators.amountInRange(10, 10, 100)).toBe(true));
  it("accepts value at max boundary", () => expect(Validators.amountInRange(100, 10, 100)).toBe(true));
  it("rejects value below min", () => expect(Validators.amountInRange(5, 10, 100)).toBe(false));
  it("rejects value above max", () => expect(Validators.amountInRange(200, 10, 100)).toBe(false));
  it("rejects zero", () => expect(Validators.amountInRange(0, 0, 100)).toBe(false));
});

describe("Validators.requiredString", () => {
  it("accepts non-empty string", () => expect(Validators.requiredString("hello")).toBe(true));
  it("rejects empty string", () => expect(Validators.requiredString("")).toBe(false));
  it("rejects whitespace-only string", () => expect(Validators.requiredString("   ")).toBe(false));
  it("rejects non-string", () => expect(Validators.requiredString(null)).toBe(false));
});

describe("Validators.stringLength", () => {
  it("accepts string within bounds", () => expect(Validators.stringLength("hello", 3, 10)).toBe(true));
  it("rejects too-short string", () => expect(Validators.stringLength("hi", 3, 10)).toBe(false));
  it("rejects too-long string", () => expect(Validators.stringLength("hello world!", 3, 10)).toBe(false));
});

describe("validateFields", () => {
  it("returns valid when all pass", () => {
    const result = validateFields([
      { field: "email", value: "a@b.com", validator: Validators.email, message: "bad email" },
    ]);
    expect(result.valid).toBe(true);
  });

  it("returns first failure", () => {
    const result = validateFields([
      { field: "email", value: "a@b.com", validator: Validators.email, message: "bad email" },
      { field: "phone", value: "bad", validator: Validators.rwandaPhone, message: "bad phone" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.field).toBe("phone");
    expect(result.message).toBe("bad phone");
  });
});
