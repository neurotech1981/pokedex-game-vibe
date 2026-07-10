import React from 'react';
import { Box, Button, Chip, Grid, Paper, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RedeemIcon from '@mui/icons-material/Redeem';
import type { BallId, HeldItemId, ItemId } from '../data/items';
import { BALLS, BALL_IDS, HELD_ITEMS, HELD_ITEM_IDS, ITEMS, ITEM_IDS } from '../data/items';
import type { VitaminId } from '../data/shop';
import { BALL_PRICES, HELD_PRICES, ITEM_PRICES, VITAMINS, VITAMIN_IDS, VITAMIN_PRICE, dailyRewardAmount } from '../data/shop';
import type { PlayerProfile } from '../utils/progression';
import { addBalls, addHeldItems, addItems, claimDailyReward, spendCoins } from '../utils/progression';
import { playChime } from '../utils/soundEffects';

interface PokeMartProps {
    profile: PlayerProfile;
    updateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

interface WareProps {
    name: string;
    description: string;
    price: number;
    owned: number;
    affordable: boolean;
    onBuy: () => void;
}

const WareCard: React.FC<WareProps> = ({ name, description, price, owned, affordable, onBuy }) => (
    <Paper
        variant="outlined"
        sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{name}</Typography>
            <Typography variant="caption" color="text.secondary">×{owned}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
            {description}
        </Typography>
        <Button size="small" variant="outlined" disabled={!affordable} onClick={onBuy} sx={{ fontWeight: 700 }}>
            🪙 {price.toLocaleString()}
        </Button>
    </Paper>
);

/**
 * The Poké Mart: spend PokéCoins on items, balls and held items, and claim
 * the daily reward. All prices live in src/data/shop.ts.
 */
const PokeMart: React.FC<PokeMartProps> = ({ profile, updateProfile }) => {
    const today = todayIso();
    const claimedToday = profile.lastDailyClaim === today;
    const nextStreak = profile.lastDailyClaim && !claimedToday ? (profile.dailyStreak ?? 0) + 1 : (profile.dailyStreak ?? 0) || 1;

    const buy = (price: number, grant: (p: PlayerProfile) => PlayerProfile) => {
        updateProfile(prev => {
            const paid = spendCoins(prev, price);
            return paid ? grant(paid) : prev;
        });
        playChime('recruit');
    };

    const handleClaimDaily = () => {
        updateProfile(prev => claimDailyReward(prev, todayIso())?.profile ?? prev);
        playChime('levelUp');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1000, mx: 'auto' }}>
            {/* Header: balance */}
            <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <StorefrontIcon sx={{ fontSize: 44, color: '#4fc3f7' }} />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Poké Mart</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Win battles, claim your daily reward and complete achievements to earn PokéCoins.
                    </Typography>
                </Box>
                <Chip
                    label={`🪙 ${profile.coins.toLocaleString()} PokéCoins`}
                    sx={{ bgcolor: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', fontWeight: 800, fontSize: '1rem', py: 2 }}
                />
            </Paper>

            {/* Daily reward */}
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <RedeemIcon sx={{ fontSize: 32, color: claimedToday ? 'text.disabled' : '#ffd700' }} />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Daily reward</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {claimedToday
                            ? `Claimed today — come back tomorrow to keep your ${profile.dailyStreak ?? 1}-day streak going!`
                            : `Claim 🪙 ${dailyRewardAmount(nextStreak)} — consecutive days grow the bonus.`}
                    </Typography>
                </Box>
                <Button variant="contained" disabled={claimedToday} onClick={handleClaimDaily} sx={{ fontWeight: 700 }}>
                    {claimedToday ? 'Claimed ✓' : 'Claim'}
                </Button>
            </Paper>

            {/* Items */}
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Items</Typography>
                <Grid container spacing={1.5}>
                    {ITEM_IDS.map((id: ItemId) => (
                        <Grid key={id} size={{ xs: 6, sm: 4, md: 3 }}>
                            <WareCard
                                name={ITEMS[id].name}
                                description={ITEMS[id].description}
                                price={ITEM_PRICES[id]}
                                owned={profile.items[id] ?? 0}
                                affordable={profile.coins >= ITEM_PRICES[id]}
                                onBuy={() => buy(ITEM_PRICES[id], p => ({ ...p, items: addItems(p.items, [id]) }))}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Poké Balls */}
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Poké Balls</Typography>
                <Grid container spacing={1.5}>
                    {BALL_IDS.map((id: BallId) => (
                        <Grid key={id} size={{ xs: 6, sm: 4, md: 3 }}>
                            <WareCard
                                name={BALLS[id].name}
                                description={BALLS[id].description}
                                price={BALL_PRICES[id]}
                                owned={profile.balls[id] ?? 0}
                                affordable={profile.coins >= BALL_PRICES[id]}
                                onBuy={() => buy(BALL_PRICES[id], p => ({ ...p, balls: addBalls(p.balls, [id]) }))}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Vitamins (EV training — used on a mon in the Team Builder) */}
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Vitamins
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        use them on a Pokémon in the Team Builder
                    </Typography>
                </Typography>
                <Grid container spacing={1.5}>
                    {VITAMIN_IDS.map((id: VitaminId) => (
                        <Grid key={id} size={{ xs: 6, sm: 4, md: 3 }}>
                            <WareCard
                                name={VITAMINS[id].name}
                                description={VITAMINS[id].description}
                                price={VITAMIN_PRICE}
                                owned={profile.vitamins[id] ?? 0}
                                affordable={profile.coins >= VITAMIN_PRICE}
                                onBuy={() => buy(VITAMIN_PRICE, p => ({
                                    ...p,
                                    vitamins: { ...p.vitamins, [id]: (p.vitamins[id] ?? 0) + 1 },
                                }))}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Held items */}
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Held Items</Typography>
                <Grid container spacing={1.5}>
                    {HELD_ITEM_IDS.map((id: HeldItemId) => (
                        <Grid key={id} size={{ xs: 6, sm: 4, md: 3 }}>
                            <WareCard
                                name={HELD_ITEMS[id].name}
                                description={HELD_ITEMS[id].description}
                                price={HELD_PRICES[id]}
                                owned={profile.heldItems[id] ?? 0}
                                affordable={profile.coins >= HELD_PRICES[id]}
                                onBuy={() => buy(HELD_PRICES[id], p => ({ ...p, heldItems: addHeldItems(p.heldItems, [id]) }))}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Box>
    );
};

export default PokeMart;
