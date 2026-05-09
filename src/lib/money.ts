export const paiseToRupees = (paise: number | bigint | string): number =>
  Number(paise) / 100;

export const rupeesToPaise = (rupees: number): number =>
  Math.round(rupees * 100);

export const formatRupees = (paise: number | bigint | string): string =>
  `₹${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
