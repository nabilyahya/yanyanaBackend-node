import { Injectable } from '@nestjs/common';
import { KW } from './keywords';
import { Weights as W } from './weights';
import { PlaceV1 } from '../map/map.service';

const cap = (x: number, min = 0, max = 100) => Math.max(min, Math.min(max, x));
const has = (arr: string[] | undefined, t: string) => !!arr?.includes(t);
const any = (arr: string[] | undefined, set: string[]) =>
  !!arr?.some((x) => set.includes(x));
const hitCount = (blob: string, list: string[], maxHits = 3) =>
  Math.min(
    maxHits,
    list.reduce((a, kw) => a + (blob.includes(kw) ? 1 : 0), 0),
  );

function openTimes(place: PlaceV1) {
  const p = place.regularOpeningHours?.periods || [];
  const opens = p.map((x) => x?.open?.time).filter(Boolean) as string[];
  const closes = p.map((x) => x?.close?.time).filter(Boolean) as string[];
  return { opens, closes };
}
const opensEarly = (place: PlaceV1) =>
  openTimes(place).opens.some((t) => t <= '0800');
const opensLate = (place: PlaceV1) =>
  openTimes(place).closes.some((t) => t >= '2330');

@Injectable()
export class ScoringService {
  scoreStudy(place: PlaceV1) {
    let s = 0;
    const reasons: string[] = [];
    const t = place.types || [];
    const blob = (place._blob || '').toLowerCase();

    if (has(t, 'library')) {
      s += W.study.typeLibrary;
      reasons.push('type:library');
    }
    if (any(t, ['cafe', 'coffee_shop', 'internet_cafe'])) {
      s += W.study.typeCafe;
      reasons.push('type:cafe-ish');
    }

    const hits = hitCount(blob, KW.study, 3);
    if (hits) {
      s += hits * W.study.keywords;
      reasons.push(`kw_study:${hits}`);
    }
    if (hitCount(blob, KW.antiStudy, 1)) {
      s -= W.study.antiPenalty;
      reasons.push('kw_antiStudy');
    }

    if (place.servesCoffee) {
      s += W.study.servesCoffee;
      reasons.push('attr:servesCoffee');
    }
    if (opensEarly(place)) {
      s += W.study.opensEarly;
      reasons.push('opensEarly');
    }

    s = cap(s);
    return { score: s, reasons };
  }

  scoreRomantic(place: PlaceV1) {
    let s = 0;
    const reasons: string[] = [];
    const t = place.types || [];
    const blob = (place._blob || '').toLowerCase();

    const hits = hitCount(blob, KW.romantic, 3);
    if (hits) {
      s += hits * W.romantic.keywords;
      reasons.push(`kw_romantic:${hits}`);
    }

    const price = place.priceLevel ?? 0;
    if (price >= 4) {
      s += W.romantic.priceHigh;
      reasons.push('price:high');
    } else if (price >= 3) {
      s += W.romantic.priceModerate;
      reasons.push('price:moderate');
    }

    if (opensLate(place)) {
      s += W.romantic.opensLate;
      reasons.push('opensLate');
    }
    if (place.liveMusic) {
      s += W.romantic.liveMusic;
      reasons.push('attr:liveMusic');
    }
    if (place.outdoorSeating) {
      s += W.romantic.outdoorSeating;
      reasons.push('attr:outdoorSeating');
    }
    if (
      any(t, [
        'fine_dining_restaurant',
        'wine_bar',
        'observation_deck',
        'park',
        'garden',
      ])
    ) {
      s += W.romantic.typeRomanticish;
      reasons.push('type:romanticish');
    }

    s = cap(s);
    return { score: s, reasons };
  }

  scoreClassic(place: PlaceV1) {
    let s = 0;
    const reasons: string[] = [];
    const t = place.types || [];
    const blob = (place._blob || '').toLowerCase();

    if (
      any(t, [
        'historical_place',
        'historical_landmark',
        'museum',
        'cultural_landmark',
      ])
    ) {
      s += W.classic.typeHeritage;
      reasons.push('type:heritage');
    }

    const hits = hitCount(blob, KW.classic, 3);
    if (hits) {
      s += hits * W.classic.keywords;
      reasons.push(`kw_classic:${hits}`);
    }

    if (any(t, ['turkish_restaurant', 'tea_house'])) {
      s += W.classic.typeLocal;
      reasons.push('type:local');
    }
    if (has(t, 'night_club')) {
      s -= W.classic.penaltyNightClub;
      reasons.push('type:night_club');
    }

    s = cap(s);
    return { score: s, reasons };
  }

  scoreAll(place: PlaceV1) {
    const study = this.scoreStudy(place);
    const romantic = this.scoreRomantic(place);
    const classic = this.scoreClassic(place);

    const lvl = (n: number) =>
      n >= W.levels.likely ? 'likely' : n >= W.levels.maybe ? 'maybe' : 'weak';

    return {
      study: { score: study.score, level: lvl(study.score) },
      romantic: { score: romantic.score, level: lvl(romantic.score) },
      classic: { score: classic.score, level: lvl(classic.score) },
      reasons: {
        study: study.reasons,
        romantic: romantic.reasons,
        classic: classic.reasons,
      },
    };
  }
}
