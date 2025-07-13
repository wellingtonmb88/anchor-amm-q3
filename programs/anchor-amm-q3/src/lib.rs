use anchor_lang::prelude::*;

declare_id!("F6fw4LXZ9rUVSg87TtiRoohgauevgcRkLRa5nW2tj1Mg");

#[program]
pub mod anchor_amm_q3 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
