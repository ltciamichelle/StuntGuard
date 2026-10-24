/**
 * Avatar Growth Configuration
 * The avatar grows with caregiver habit consistency (points from logging MP-ASI),
 * NOT with child measurements.
 */

export type AvatarStageKey = 'tunas' | 'daun' | 'tanaman_kecil' | 'tanaman_besar' | 'pohon_berbunga';

export interface AvatarStageConfig {
  stage: number;
  key: AvatarStageKey;
  name: string;
  minPoints: number;
  description: string;
}

export const AVATAR_STAGES: AvatarStageConfig[] = [
  {
    stage: 1,
    key: 'tunas',
    name: 'Tunas Hijau',
    minPoints: 0,
    description: 'Awal langkah kebiasaan sehat keluarga Anda.',
  },
  {
    stage: 2,
    key: 'daun',
    name: 'Kecambah Berdaun',
    minPoints: 100,
    description: 'Mulai tumbuh berkat konsistensi catatan Anda.',
  },
  {
    stage: 3,
    key: 'tanaman_kecil',
    name: 'Tanaman Kecil',
    minPoints: 300,
    description: 'Tumbuh subur dan semakin kuat setiap hari.',
  },
  {
    stage: 4,
    key: 'tanaman_besar',
    name: 'Tanaman Rimbun',
    minPoints: 600,
    description: 'Kebiasaan baik Anda kini telah berakar kokoh.',
  },
  {
    stage: 5,
    key: 'pohon_berbunga',
    name: 'Pohon Berbunga',
    minPoints: 1000,
    description: 'Mekar sempurna memberikan kebahagiaan bagi keluarga.',
  },
];

export interface AvatarProgress {
  currentStage: AvatarStageConfig;
  nextStage: AvatarStageConfig | null;
  points: number;
  remainingToNext: number;
  progressPercent: number;
  progressText: string;
}

/**
 * Calculates current avatar growth stage and progress to next threshold
 */
export function getAvatarProgress(totalPoints: number): AvatarProgress {
  const points = Math.max(0, totalPoints);

  let currentStageIndex = 0;
  for (let i = AVATAR_STAGES.length - 1; i >= 0; i--) {
    if (points >= AVATAR_STAGES[i].minPoints) {
      currentStageIndex = i;
      break;
    }
  }

  const currentStage = AVATAR_STAGES[currentStageIndex];
  const nextStage = currentStageIndex < AVATAR_STAGES.length - 1 ? AVATAR_STAGES[currentStageIndex + 1] : null;

  if (!nextStage) {
    return {
      currentStage,
      nextStage: null,
      points,
      remainingToNext: 0,
      progressPercent: 100,
      progressText: 'Tanaman kebiasaan Anda sudah mekar sempurna!',
    };
  }

  const currentMin = currentStage.minPoints;
  const nextMin = nextStage.minPoints;
  const pointsInCurrentRange = points - currentMin;
  const rangeSpan = nextMin - currentMin;
  const remainingToNext = Math.max(0, nextMin - points);
  const progressPercent = Math.min(100, Math.max(0, Math.round((pointsInCurrentRange / rangeSpan) * 100)));

  return {
    currentStage,
    nextStage,
    points,
    remainingToNext,
    progressPercent,
    progressText: `Tinggal ${remainingToNext} poin lagi untuk tumbuh`,
  };
}
