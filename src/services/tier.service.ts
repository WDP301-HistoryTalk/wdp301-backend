import Tier from '../models/tier.model';


export class TierService {
  static async list() {
    const tiers = await Tier.find();
    return tiers.map(t => ({
      tierId: t._id.toString(),
      title: t.title,
      amount: t.amount,
      noMonth: t.noMonth,
      limitedToken: t.limitedToken,
      isActive: t.isActive
    }));
  }

  static async getById(id: string) {
    const t = await Tier.findById(id);
    if (!t) return null;
    return {
      tierId: t._id.toString(),
      title: t.title,
      amount: t.amount,
      noMonth: t.noMonth,
      limitedToken: t.limitedToken,
      isActive: t.isActive
    };
  }

  static async create(data: { title: string; amount: number; noMonth: number; limitedToken: number; isActive?: boolean }) {
    const t = new Tier(data);
    await t.save();
    return {
      tierId: t._id.toString(),
      title: t.title,
      amount: t.amount,
      noMonth: t.noMonth,
      limitedToken: t.limitedToken,
      isActive: t.isActive
    };
  }

  static async update(id: string, data: Partial<{ title: string; amount: number; noMonth: number; limitedToken: number; isActive: boolean }>) {
    const t = await Tier.findByIdAndUpdate(id, data, { new: true });
    if (!t) return null;
    return {
      tierId: t._id.toString(),
      title: t.title,
      amount: t.amount,
      noMonth: t.noMonth,
      limitedToken: t.limitedToken,
      isActive: t.isActive
    };
  }

  static async delete(id: string) {
    const t = await Tier.findByIdAndDelete(id);
    return t !== null;
  }
}
