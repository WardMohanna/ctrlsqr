//Unit tests: small, isolated logic or functions.
function add(a: number, b: number) {
    return a + b;
  }
  
  describe("add function (Unit)", () => {
    it("adds two numbers", () => {
      expect(add(2, 3)).toBe(5);
    });
  });
  