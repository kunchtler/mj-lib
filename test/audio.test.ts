import { describe, expect, it } from "vitest";
import { formatNote } from "../src/audio/NoteFormatter";

describe("Note formatting", () => {
    it("German key notation", () => {
        expect(formatNote("A")).toBe("A4");
        expect(formatNote("B")).toBe("B4");
        expect(formatNote("C")).toBe("C4");
        expect(formatNote("D")).toBe("D4");
        expect(formatNote("E")).toBe("E4");
        expect(formatNote("F")).toBe("F4");
        expect(formatNote("G")).toBe("G4");
    });
    it("Fixed Do key notation", () => {
        expect(formatNote("Do")).toBe("C4");
        expect(formatNote("Re")).toBe("D4");
        expect(formatNote("Mi")).toBe("E4");
        expect(formatNote("Fa")).toBe("F4");
        expect(formatNote("Sol")).toBe("G4");
        expect(formatNote("La")).toBe("A4");
        expect(formatNote("Si")).toBe("B4");
    });
    it("Note height (number)", () => {
        expect(formatNote("D5")).toBe("D5");
    });
    it("Note height (abc notation)", () => {
        expect(formatNote("E'")).toBe("E5");
        expect(formatNote("F''")).toBe("F6");
        expect(formatNote("G,")).toBe("G3");
        expect(formatNote("La,,")).toBe("A2");
        expect(formatNote("A,,,,")).toBe("A0");
    });
    describe("Alterations", () => {
        it("Sharp (standard)", () => {
            expect(formatNote("Re#5")).toBe("D5#");
        });
        it("Sharp (abc notation)", () => {
            expect(formatNote("^Re5")).toBe("D5#");
        });
        it("Flat (standard)", () => {
            expect(formatNote("Reb5")).toBe("C5#");
        });
        it("Flat (abc notation)", () => {
            expect(formatNote("_Re5")).toBe("C5#");
        });
        it("Double sharp (standard)", () => {
            expect(formatNote("Re##5")).toBe("E5");
        });
        it("Double sharp (abc notation)", () => {
            expect(formatNote("^^Re5")).toBe("E5");
        });
        it("Double flat (standard)", () => {
            expect(formatNote("Rebb5")).toBe("C5");
        });
        it("Double flat (abc notation)", () => {
            expect(formatNote("__Re5")).toBe("C5");
        });
        it("Natural (standard)", () => {
            expect(formatNote("Re=5")).toBe("D5");
        });
        it("Natural (abc notation)", () => {
            expect(formatNote("=Re5")).toBe("D5");
        });
    });
});
