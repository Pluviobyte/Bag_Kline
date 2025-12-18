import { TianGan, DiZhi, WuXing, Pillar, BaZiChart } from '@/lib/types';

// 天干数组
const TIAN_GAN: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 地支数组
const DI_ZHI: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干五行映射
const TIAN_GAN_WU_XING: Record<TianGan, WuXing> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// 地支五行映射
const DI_ZHI_WU_XING: Record<DiZhi, WuXing> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

// 地支对应时辰
const HOUR_TO_DI_ZHI: Record<number, DiZhi> = {
  23: '子', 0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅',
  5: '卯', 6: '卯', 7: '辰', 8: '辰', 9: '巳', 10: '巳',
  11: '午', 12: '午', 13: '未', 14: '未', 15: '申', 16: '申',
  17: '酉', 18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥',
};

// 年上起月表（根据年干推算月干）
const MONTH_GAN_TABLE: Record<TianGan, TianGan[]> = {
  '甲': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
  '乙': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
  '丙': ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
  '丁': ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
  '戊': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
  '己': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
  '庚': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
  '辛': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
  '壬': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
  '癸': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
};

// 日上起时表（根据日干推算时干）
const HOUR_GAN_TABLE: Record<TianGan, TianGan[]> = {
  '甲': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
  '乙': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
  '丙': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
  '丁': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
  '戊': ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
  '己': ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
  '庚': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
  '辛': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
  '壬': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
  '癸': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
};

/**
 * 根据公历年份计算年柱干支
 * 使用简化算法：(年份 - 3) % 60
 */
function getYearGanZhi(year: number): { gan: TianGan; zhi: DiZhi } {
  // 1984年是甲子年，以此为基准
  const base = 1984;
  const offset = (year - base) % 60;
  const ganIndex = offset % 10;
  const zhiIndex = offset % 12;

  return {
    gan: TIAN_GAN[ganIndex < 0 ? ganIndex + 10 : ganIndex],
    zhi: DI_ZHI[zhiIndex < 0 ? zhiIndex + 12 : zhiIndex],
  };
}

/**
 * 根据月份和年干计算月柱干支
 * 注意：需要考虑节气，这里简化为按阳历月份
 */
function getMonthGanZhi(month: number, yearGan: TianGan): { gan: TianGan; zhi: DiZhi } {
  // 地支：寅月(1月)、卯月(2月)...丑月(12月)
  // 注意：农历正月是寅月
  const zhiIndex = (month + 1) % 12; // 1月对应寅(2), 2月对应卯(3)...
  const zhi = DI_ZHI[zhiIndex];

  // 根据年干查月干表
  const monthGanList = MONTH_GAN_TABLE[yearGan];
  const gan = monthGanList[month - 1];

  return { gan, zhi };
}

/**
 * 根据日期计算日柱干支
 * 使用蔡勒公式的变体计算
 */
function getDayGanZhi(date: Date): { gan: TianGan; zhi: DiZhi } {
  // 基准日：2000-01-01 为庚辰日
  const baseDate = new Date('2000-01-01');
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  // 庚辰在天干地支中的索引：庚=6, 辰=4
  const baseGanIndex = 6;
  const baseZhiIndex = 4;

  const ganIndex = (baseGanIndex + daysDiff) % 10;
  const zhiIndex = (baseZhiIndex + daysDiff) % 12;

  return {
    gan: TIAN_GAN[ganIndex < 0 ? ganIndex + 10 : ganIndex],
    zhi: DI_ZHI[zhiIndex < 0 ? zhiIndex + 12 : zhiIndex],
  };
}

/**
 * 根据时辰和日干计算时柱干支
 */
function getHourGanZhi(hour: number, dayGan: TianGan): { gan: TianGan; zhi: DiZhi } {
  // 确定地支时辰
  const zhi = HOUR_TO_DI_ZHI[hour] || '子';

  // 根据日干查时干表
  const zhiIndex = DI_ZHI.indexOf(zhi);
  const hourGanList = HOUR_GAN_TABLE[dayGan];
  const gan = hourGanList[zhiIndex];

  return { gan, zhi };
}

/**
 * 创建柱对象
 */
function createPillar(gan: TianGan, zhi: DiZhi): Pillar {
  return {
    gan,
    zhi,
    ganWuXing: TIAN_GAN_WU_XING[gan],
    zhiWuXing: DI_ZHI_WU_XING[zhi],
    label: `${gan}${zhi}`,
  };
}

/**
 * 根据日期时间计算完整的四柱八字
 * @param dateTime - ISO 8601格式的日期时间字符串或Date对象
 * @returns 四柱八字命盘
 */
export function calculateBaZi(dateTime: string | Date): BaZiChart {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS月份从0开始
  const hour = date.getHours();

  // 计算年柱
  const yearGZ = getYearGanZhi(year);
  const yearPillar = createPillar(yearGZ.gan, yearGZ.zhi);

  // 计算月柱
  const monthGZ = getMonthGanZhi(month, yearGZ.gan);
  const monthPillar = createPillar(monthGZ.gan, monthGZ.zhi);

  // 计算日柱
  const dayGZ = getDayGanZhi(date);
  const dayPillar = createPillar(dayGZ.gan, dayGZ.zhi);

  // 计算时柱
  const hourGZ = getHourGanZhi(hour, dayGZ.gan);
  const hourPillar = createPillar(hourGZ.gan, hourGZ.zhi);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayMaster: dayGZ.gan, // 日主（日干）
  };
}

/**
 * 获取2025年流年干支
 */
export function get2025LiuNian(): { gan: TianGan; zhi: DiZhi; label: string } {
  const gz = getYearGanZhi(2025);
  return {
    gan: gz.gan,
    zhi: gz.zhi,
    label: `${gz.gan}${gz.zhi}`,
  };
}
