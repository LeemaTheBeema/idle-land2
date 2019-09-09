
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { IGuild, GuildRecruitMode, GuildResource, GuildBuilding, GuildMemberTier } from '../../interfaces';

@Entity()
export class Guild implements IGuild {

  @ObjectIdColumn() public _id: string;

  @Index({ unique: true })
  @Column() public name: string;

  @Index({ unique: true })
  @Column() public tag: string;

  @Column() public motd: string;
  @Column() public recruitment: GuildRecruitMode;
  @Column() public taxes: { [key in GuildResource]?: number };
  @Column() public resources: { [key in GuildResource]: number };
  @Column() public crystals: { [key: string]: number };
  @Column() public activeBuildings: { [key in GuildBuilding]?: boolean };
  @Column() public buildingLevels: { [key in GuildBuilding]?: number };
  @Column() public members: { [key: string]: GuildMemberTier };

  public init() {
    if(!this.motd) this.motd = 'Welcome to your guild!';
    if(!this.recruitment) this.recruitment = 'Closed';
    if(!this.taxes) this.taxes = { [GuildResource.Gold]: 0 };
    if(!this.resources) {
      this.resources = {
        [GuildResource.Gold]: 0,
        [GuildResource.Astralium]: 0,
        [GuildResource.Clay]: 0,
        [GuildResource.Stone]: 0,
        [GuildResource.Wood]: 0
      };
    }
    if(!this.crystals) this.crystals = { };
    if(!this.activeBuildings) {
        this.activeBuildings = {
        [GuildBuilding.GuildHall]: true,
        [GuildBuilding.Stash]: true
      };
    }
    if(!this.buildingLevels) {
      this.buildingLevels = {
        [GuildBuilding.GuildHall]: 1,
        [GuildBuilding.Stash]: 1
      };
    }
    if(!this.members) this.members = { };
  }

  public totalBuildingPoints(): number {
    return 0;
  }

  public usedBuildingPoints(): number {
    return 0;
  }

  public addMember(name: string, tier: GuildMemberTier) {
    this.members[name] = tier;
  }
}
