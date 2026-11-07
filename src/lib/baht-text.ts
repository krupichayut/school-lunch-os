/**
 * แปลงจำนวนเงินตัวเลขเป็นคำอ่านภาษาไทย (Thai Baht Text Converter)
 * รองรับหลักหน่วยถึงหลักล้าน, จุดทศนิยม (สตางค์), และคำลงท้ายตามระเบียบพัสดุและการเงินราชการ
 */

export function toBahtText(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === "") return "ศูนย์บาทถ้วน";
  
  const cleanNum = typeof num === "string" ? parseFloat(num.replace(/,/g, "").trim()) : num;
  if (isNaN(cleanNum)) return "ศูนย์บาทถ้วน";
  if (cleanNum === 0) return "ศูนย์บาทถ้วน";

  const nums = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function convertGroup(nStr: string): string {
    let res = "";
    const len = nStr.length;
    const totalVal = parseInt(nStr, 10);

    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr[i], 10);
      const pos = len - 1 - i;
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && totalVal > 1) {
          res += "เอ็ด";
        } else if (pos === 1 && digit === 1) {
          res += "สิบ";
        } else if (pos === 1 && digit === 2) {
          res += "ยี่สิบ";
        } else {
          res += nums[digit] + units[pos];
        }
      }
    }
    return res;
  }

  const isNegative = cleanNum < 0;
  const absNum = Math.abs(cleanNum);
  const parts = absNum.toFixed(2).split(".");
  const baht = parts[0];
  const satang = parts[1];

  let bahtStr = "";
  if (parseInt(baht, 10) === 0) {
    bahtStr = "";
  } else {
    let remaining = baht;
    let millionsCount = 0;
    while (remaining.length > 0) {
      const chunk = remaining.slice(-6);
      remaining = remaining.slice(0, -6);
      const groupText = convertGroup(chunk);
      if (groupText) {
        bahtStr = groupText + (millionsCount > 0 ? "ล้าน".repeat(millionsCount) : "") + bahtStr;
      }
      millionsCount++;
    }
  }

  let satangStr = "";
  const satangVal = parseInt(satang, 10);
  if (satangVal > 0) {
    satangStr = convertGroup(satang) + "สตางค์";
  } else {
    satangStr = "ถ้วน";
  }

  const prefix = isNegative ? "ลบ" : "";
  if (!bahtStr && satangVal > 0) {
    return `${prefix}${satangStr}`;
  }

  return `${prefix}${bahtStr}บาท${satangStr}`;
}

/**
 * แปลงตัวเลขเป็นเลขไทย (Thai Numerals)
 */
export function toThaiNumerals(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return str.replace(/[0-9]/g, (digit) => thaiDigits[parseInt(digit, 10)]);
}
