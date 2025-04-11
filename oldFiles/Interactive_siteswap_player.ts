import { Ball } from "../simulator/Ball";
import { Hand } from "../simulator/Hand";
import { Juggler } from "../simulator/Juggler";
import { Simulator } from "../simulator/Simulator";
import { JugglingEvent } from "../simulator/Timeline";

function lance(
    ball: Ball,
    time: number,
    flight_time: number,
    source: Hand,
    target: Hand,
    unit_time: number,
    sound?: string[] | string
): void {
    const ev1 = new JugglingEvent(time, unit_time, "THROW", source, ball);
    const ev2 = new JugglingEvent(time + flight_time, unit_time, "CATCH", target, ball, sound);
    ev1.pair_with(ev2);
    ball.timeline = ball.timeline.insert(ev1.time, ev1);
    ball.timeline = ball.timeline.insert(ev2.time, ev2);
    source.timeline = source.timeline.insert(ev1.time, ev1);
    target.timeline = target.timeline.insert(ev2.time, ev2);
}

function conv_siteswap_to_pattern(siteswap: string): number[][] {
    const pattern: number[][] = [[], []];
    if (!siteswap.includes("(")) {
        if (siteswap.length % 2 === 1) {
            siteswap = siteswap + siteswap;
        }
        for (let i = 0; i < siteswap.length; i++) {
            pattern[i % 2][i] = parseInt(siteswap.substring(i, i + 1));
            pattern[(i + 1) % 2][i] = 0;
        }
    } else {
        let c = 0;
        //for (let i = 0; i != -1; i = siteswap.indexOf(")", i))

        while (c < siteswap.length) {
            if (siteswap.includes("(", c)) {
                const synchro = siteswap.substring(
                    siteswap.indexOf("(", c) + 1,
                    siteswap.indexOf(")", c)
                );
                for (let i = 0; i < synchro.length; i++) {
                    pattern[i % 2][pattern[i % 2].length] = parseInt(synchro.substring(i, i + 1)); //We add to the last box the throw
                    pattern[i % 2][pattern[i % 2].length] = 0; //We add zero to the last box
                }
                c = siteswap.indexOf(")", c) + 1;
            } else {
                break;
            }
        }
    }
    //console.log(pattern);
    return pattern;
}

function lance_pattern(
    pattern: number[][],
    colors: string[],
    u: number,
    d: number,
    juggler: Juggler,
    simulator: Simulator
): void {
    function pre_lancer(pattern: number[][], size: number, held_balls: Ball[]): void {
        /// May be convert to boolean to handle errors
        const thrown_max = Math.max(...pattern.flat());
        function known_all_positions(pier: number[][]): boolean {
            for (let i = 0; i < thrown_max - 1; i++) {
                for (const subArray of pier) {
                    if (!(subArray[i] === 0 || subArray[i] === 1)) {
                        return false;
                    }
                }
            }
            return true;
        }
        //const pier: number[][] = [];
        const pier: number[][] = Array.from(pattern, () => Array<number>(thrown_max));
        // for (const item of pattern) {
        //     pier.push([]); // Ajoutez un nouveau sous-tableau vide
        //}
        while (!known_all_positions(pier)) {
            for (let i = 0; i < size; i++) {
                if (i % pattern.length === 0) {
                    for (let i2 = 0; i2 < pattern.length; i2++) {
                        pier[i2].splice(0, 1);
                        pier[i2][thrown_max - 1] = 0;
                    }
                }
                if (pattern[i % pattern.length][~~(i / pattern.length)] != 0) {
                    pier[
                        ((i % pattern.length) +
                            pattern[i % pattern.length][~~(i / pattern.length)]) %
                            2
                    ][pattern[i % pattern.length][~~(i / pattern.length)] - 1] = 1;
                }
            }
        }
        // Execute pier in time -u
        const spattern: number[][] = [[], []]; // All pier execute at time -u with hand i (spattern[i])
        const totale_size = pier.reduce((total, subArray) => total + subArray.length, 0);

        // Make spattern and execute it
        for (let i = 0; i < totale_size; i++) {
            if (pier[i % pier.length][~~(i / pier.length)] === 1) {
                const last_spattern_position = spattern.flat().length;
                spattern[i % pier.length][last_spattern_position] = ~~(i / pier.length) + 1;
                copyBalls(held_balls[last_spattern_position], held_balls_hand, i, pier.length);
                lance(
                    held_balls[last_spattern_position],
                    -u,
                    u * (~~(i / pier.length) + 1) - d,
                    juggler.hands[i % 2],
                    juggler.hands[i % 2],
                    u
                );
            }
        }
        //console.log(spattern);
    }
    function thrown_from_0(held_balls: Ball[], held_balls_hand: Ball[][][], i: number): void {
        if (held_balls_hand[i % 2][~~(i / pattern.length)] !== undefined) {
            for (let i2 = 0; i2 < held_balls_hand[i % 2][~~(i / pattern.length)].length; i2++) {
                let new_position: number;
                if (held_balls_hand[i2 % 2][~~(i / pattern.length) + 1] != undefined) {
                    new_position = held_balls_hand[i2 % 2][~~(i / pattern.length) + 1].length;
                } else {
                    new_position = 0;
                    held_balls_hand[i2 % 2][~~(i / pattern.length) + 1] = [];
                }
                held_balls_hand[i2 % 2][~~(i / pattern.length) + 1][new_position] =
                    held_balls_hand[i2 % 2][~~(i / pattern.length)][i2];
            }
        }
        //Normalement inutile
        // if (held_balls[i] != undefined) {
        //     held_balls.splice(i, 0, undefined);
        //     //console.log(held_balls, i);
        // }
    }
    function copyBalls(ball: Ball, held_balls_hand: Ball[][][], i: number, length: number): void {
        const table: Ball[] = [];
        held_balls_hand[i % 2][~~(i / length)] = table;
        held_balls_hand[i % 2][~~(i / length)][0] = ball;
    }

    // Count the balls needed and check if it is_Parallel
    let n_balls = 0;
    for (const subArray of pattern) {
        n_balls += subArray.reduce((p, c) => p + c, 0) / subArray.length;
    }

    // Build the balls
    for (let i = 0; i < Math.round(n_balls); i++) {
        simulator.balls[i] = new Ball({ color: { color: colors[i], radius: 0.04 } });
    }

    // Add balls to scene
    simulator.balls.forEach((ball) => {
        simulator.scene.add(ball.mesh);
    });

    // Build the sequence of throws
    const total_size = pattern.reduce((total, subArray) => total + subArray.length, 0);
    const N = total_size * 50;
    const held_balls: Ball[] = Array<Ball>(N); // TODO replace to juste balls to take.
    const held_balls_hand: Ball[][][] = [[], []];
    for (let i = 0; i < simulator.balls.length; i++) {
        held_balls[i] = simulator.balls[i];
    }

    pre_lancer(pattern, total_size, held_balls);
    main(N, held_balls, held_balls_hand, pattern);
    function main(N: number, held_balls: Ball[], held_balls_hand: Ball[][][], pattern: number[][]) {
        for (let i = 0; i < N - total_size; i++) {
            //const h = pattern.flat()[i % total_size];
            const h =
                pattern[i % pattern.length][
                    ~~(i / pattern.length) % pattern[i % pattern.length].length
                ]; //[select each table one by one][select each i frome 0 to pattern[subarray].length, this for each subarray]
            if (h === 0) {
                thrown_from_0(held_balls, held_balls_hand, i);
            } else {
                console.assert(held_balls_hand[i % 2][~~(i / pattern.length)] != undefined);
                // if (held_balls_hand[i % 2][~~(i / pattern.length)] == undefined) {
                //     //Impossible, but juste for verify
                //     if (held_balls[i] != undefined) {
                //         copyBalls(held_balls[i], held_balls_hand, i, pattern.length);
                //     } else {
                //         console.log(
                //             "held_balls_hand[",
                //             i % 2,
                //             "][",
                //             ~~(i / pattern.length),
                //             "] et held_balls[",
                //             i,
                //             "] sont undefined.",
                //             held_balls,
                //             held_balls_hand
                //         );
                //         //     deleteEmptyBox([], held_balls_hand, i, pattern.length);
                //         //     //held_balls_hand[i % 2].splice(~~(i / pattern.length), 1);
                //     }
                // }
                if (held_balls_hand[(i + h) % 2][~~(i / pattern.length) + h] == undefined) {
                    held_balls_hand[(i + h) % 2][~~(i / pattern.length) + h] = [];
                }
                held_balls_hand[(i + h) % 2][~~(i / pattern.length) + h][
                    held_balls_hand[(i + h) % 2][~~(i / pattern.length) + h].length
                ] = held_balls[i] = held_balls_hand[i % 2][~~(i / pattern.length)][0];
                //held_balls[i] = held_balls_hand[i % 2][~~(i / pattern.length)][0];
                if (held_balls_hand[i % 2][~~(i / pattern.length)].length > 1) {
                    if (held_balls_hand[i % 2][~~(i / pattern.length) + 1] != undefined) {
                        held_balls_hand[i % 2][~~(i / pattern.length) + 1] = [
                            ...held_balls_hand[i % 2][~~(i / pattern.length)].slice(1),
                            ...held_balls_hand[i % 2][~~(i / pattern.length) + 1]
                        ];
                    } else {
                        held_balls_hand[i % 2][~~(i / pattern.length) + 1] = [];
                        held_balls_hand[i % 2][~~(i / pattern.length) + 1] = [
                            ...held_balls_hand[i % 2][~~(i / pattern.length)].slice(1)
                        ];
                    }
                }
                const time: number = ~~(i / pattern.length) * u;
                const flight_time: number = h * u - d;
                lance(
                    held_balls[i],
                    time, //~~(i / pattern.length) * u,
                    flight_time, //h * u - d,
                    juggler.hands[i % 2],
                    juggler.hands[(i + h) % 2],
                    u
                );
            }
        }

        console.log(held_balls_hand);
    }

    simulator.balls = simulator.balls.filter((ball) => {
        return ball.timeline.length !== 0;
    });
}

export { conv_siteswap_to_pattern, lance, lance_pattern };
