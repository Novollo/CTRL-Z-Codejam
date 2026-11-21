/** "1 student", "14 students"; "1 person", "3 people". */
export const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
