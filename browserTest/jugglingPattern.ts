import { JugglingAppParams } from "../../src/MusicalJuggling";

export const pattern: JugglingAppParams = {
    jugglers: [
        [
            "Name",
            {
                balls: [
                    { id: "Sib?A", name: "Sib", color: "purple", sound: "Sib" },
                    { id: "Si?A", name: "Si", color: "white", sound: "Si" },
                    { id: "Re'?A", name: "Re'", color: "orange", sound: "Re'" }
                ],
                events: [
                    [
                        "0",
                        {
                            tempo: "1",
                            hands: [["Sib"], ["Re'", "Si"]],
                            pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300"
                        }
                    ]
                ]
            }
        ]
    ],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
};
