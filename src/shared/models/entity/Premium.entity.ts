
import { Entity, ObjectIdColumn, Column } from 'typeorm';

import { PlayerOwned } from './PlayerOwned';
import { PermanentUpgrade, PremiumTier, PremiumScale, ItemClass } from '../../interfaces';

import * as Gachas from '../../../shared/astralgate';
import { Player } from './Player.entity';

@Entity()
export class Premium extends PlayerOwned {

  // internal vars
  @ObjectIdColumn() public _id: string;

  @Column()
  private ilp: number;

  @Column()
  private premiumTier: PremiumTier;

  @Column()
  private upgradeLevels: { [key in PermanentUpgrade]?: number };

  @Column()
  private gachaFreeRolls: { [key: string]: number };

  public get $premiumData() {
    return { ilp: this.ilp, tier: this.premiumTier, upgradeLevels: this.upgradeLevels, gachaFreeRolls: this.gachaFreeRolls };
  }

  constructor() {
    super();
    if(!this.ilp) this.ilp = 0;
    if(!this.premiumTier) this.premiumTier = PremiumTier.None;
    if(!this.upgradeLevels) this.upgradeLevels = {};
    if(!this.gachaFreeRolls) this.gachaFreeRolls = {};
  }

  hasILP(ilp: number): boolean {
    return this.ilp >= ilp;
  }

  gainILP(ilp: number) {
    this.ilp += ilp;
  }

  spendILP(ilp: number) {
    this.ilp -= ilp;
    this.ilp = Math.max(this.ilp, 0);
  }

  buyUpgrade(upgrade: PermanentUpgrade): boolean {
    if(!PremiumScale[upgrade]) return false;

    const curLevel = this.getUpgradeLevel(upgrade);
    const cost = Math.pow(PremiumScale[upgrade], curLevel + 1);

    if(!this.hasILP(cost)) return false;
    this.upgradeLevels[upgrade] = this.upgradeLevels[upgrade] || 0;
    this.upgradeLevels[upgrade]++;

    this.spendILP(cost);
    return true;
  }

  getUpgradeLevel(upgrade: PermanentUpgrade): number {
    return this.upgradeLevels[upgrade] || 0;
  }

  getNextFreeRoll(gachaName: string) {
    return this.gachaFreeRolls[gachaName] || 0;
  }

  doGachaRoll(player: Player, gachaName: string, numRolls = 1): false|any[] {
    if(!Gachas[gachaName]) return false;

    const gacha = new Gachas[gachaName]();
    if(!gacha.canRoll(player, numRolls)) return false;

    if(gacha.canRollFree(player)) {
      this.gachaFreeRolls[gacha.name] = gacha.getNextGachaFreeInterval();
      player.increaseStatistic('Astral Gate/Roll/Free', 1);
    } else {
      gacha.spendCurrency(player, numRolls);
      player.increaseStatistic('Astral Gate/Roll/Currency', 1);
    }

    player.increaseStatistic(`Astral Gate/Gates/${gacha.name}`, 1);

    let rewards = [];
    for(let i = 0; i < numRolls; i++) {
      rewards.push(gacha.roll());
    }

    rewards = this.validateRewards(player, rewards);

    this.earnGachaRewards(player, rewards);

    return rewards;
  }

  private validateRewards(player: Player, rewards: string[]): string[] {
    return rewards.map(reward => {

      // we can't get the same collectible twice if we have it
      if(reward.includes('collectible')) {
        const [x, y, color] = reward.split(':');
        if(player.$collectibles.hasCurrently(`Pet Soul: ${color}`)) return `item:Crystal:${color}`;
      }

      return reward;
    });
  }

  private earnGachaRewards(player: Player, rewards: string[]): void {
    rewards.forEach(reward => {
      const [main, sub, choice] = reward.split(':');

      switch(main) {
        case 'xp': {
          const xpGained = {
            sm:  (char) => Math.floor(char.xp.maximum * 0.01),
            md:  (char) => Math.floor(char.xp.maximum * 0.05),
            lg:  (char) => Math.floor(char.xp.maximum * 0.10),
            max: (char) => Math.floor(char.xp.maximum)
          };

          if(sub === 'player') {
            player.gainXP(xpGained[choice](player));
          }

          if(sub === 'pet') {
            player.$pets.$activePet.gainXP(xpGained[choice](player.$pets.$activePet));
          }

          break;
        }

        case 'gold': {
          const goldEarned = { sm: 1000, md: 10000, lg: 100000 };
          player.gainGold(goldEarned[choice]);
          break;
        }

        case 'collectible': {
          if(sub === 'Soul') {
            player.tryFindCollectible({
              name: `Pet Soul: ${choice}`,
              rarity: ItemClass.Goatly,
              description: `A floating ball of... pet essence? Perhaps you can tame this ${choice} soul.`,
              storyline: `Lore: Astral Gate`
            });
          }
          break;
        }

        case 'item': {
          if(sub === 'Crystal') {
            player.$pets.addAscensionMaterial(`Crystal${choice}`);
          }
          break;
        }

      }
    });
  }
}