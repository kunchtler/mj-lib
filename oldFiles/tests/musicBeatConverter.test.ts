import { expect, test, describe } from "vitest";
import { MusicBeatConverter, MusicTime } from "../src/tocategorize/musicBeatConverter";
import Fraction from "fraction.js";

const converter = new MusicBeatConverter([
    [1, new Fraction("3/4")],
    [3, new Fraction("1/2")],
    [4, new Fraction("3/7")]
]);

describe("Beat exitence in a given measure", () => {
    describe("Measure before the first specified", () => {
        test("", () => {
            expect(converter.validateMusicTime([-1, new Fraction("0")])).toBe(true);
        });
        test("", () => {
            expect(converter.validateMusicTime([-1, new Fraction("0")])).toBe(true);
        });
    });
    test("Beat to high, in measure before the first specified.", () => {
        expect(converter.validateMusicTime([-1, new Fraction("0")])).toBe(true);
    });
    test("Beat to high, in measure before the first specified.", () => {
        expect(converter.validateMusicTime([-1, new Fraction("0")])).toBe(true);
    });
    test("Beat to high, in measure before the first specified.", () => {
        expect(converter.validateMusicTime([-1, new Fraction("0")])).toBe(true);
    });
    test("Beat to high, in measure before the first specified.", () => {
        expect(converter.validateMusicTime([-1, new Fraction("0")])).toBe(true);
    });
});
test("");

// const validateTests: [MusicTime, boolean][] = [
//     [[-1, new Fraction("0")], true],
//     [[0, new Fraction("4/4")], false],
//     [[2, new Fraction("2/5")], true],
//     [[2, new Fraction("3/4")], false]
// ];
// for (const [time, answer] of validateTests) {
//     if (converter.validateMusicTime(time) !== answer) {
//         console.log("Error in validate.");
//     }
// }

// const convertTests: [MusicTime, Fraction][] = [
//     [[-1, new Fraction("0")], new Fraction("-3/4")],
//     [[1, new Fraction("0")], new Fraction("3/4")],
//     [[2, new Fraction("0")], new Fraction("6/4")],
//     [[3, new Fraction("0")], new Fraction("9/4")],
//     [[4, new Fraction("0")], new Fraction("11/4")],
//     [[5, new Fraction("0")], new Fraction("89/28")],
//     [[6, new Fraction("0")], new Fraction("101/28")],
//     [[-1, new Fraction("1/4")], new Fraction("-2/4")],
//     [[2, new Fraction("1/4")], new Fraction("7/4")],
//     [[6, new Fraction("1/7")], new Fraction("105/28")]
// ];
// for (const [time, absBeat] of convertTests) {
//     if (!converter.convertMeasureBeat(time).equals(absBeat)) {
//         console.log("Error in convertMeasureBeat.");
//     }
//     const answer = converter.convertAbsoluteBeat(absBeat);
//     if (!(answer[0] === time[0] && answer[1].equals(time[1]))) {
//         console.log("Error in convertMeasureBeat.");
//     }
// }
