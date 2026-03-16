const {
    buildPickupMessage,
    buildTradeMessage,
    getUsernameForRosterId,
    draftSlot,
} = require('../lib');

describe('draftSlot', () => {
    test('pads single digit draft slot with leading zero', () => {
        const pick = { draft_slot: 3, round: 1 };
        expect(draftSlot(pick)).toBe('03');
    });

    test('reverses order on even rounds', () => {
        const pick = { draft_slot: 3, round: 2 };
        // 11 - 3 = 8
        expect(draftSlot(pick)).toBe('08');
    });
});

describe('getUsernameForRosterId', () => {
    test('returns matching user display name', () => {
        const rosters = [{ roster_id: 1, owner_id: 'user-1' }];
        const users = [{ user_id: 'user-1', display_name: 'Alice' }];
        expect(getUsernameForRosterId(rosters, users, 1)).toBe('Alice');
    });

    test('falls back to "Unknown" when no user found', () => {
        const rosters = [{ roster_id: 1, owner_id: 'user-1' }];
        const users = [];
        expect(getUsernameForRosterId(rosters, users, 1)).toBe('Unknown');
    });
});

describe('buildPickupMessage', () => {
    const players = {
        'p1': { full_name: 'Player One' },
        'p2': { first_name: 'Player', last_name: 'Two' },
    };
    const rosters = [{ roster_id: 1, owner_id: 'user-1' }];
    const users = [{ user_id: 'user-1', display_name: 'Alice' }];

    test('formats waiver pickup and drop message', () => {
        const txn = {
            type: 'waiver',
            roster_ids: [1],
            adds: { 'p1': 1 },
            drops: { 'p2': 1 },
        };

        const msg = buildPickupMessage(players, rosters, users, txn);
        expect(msg).toContain('__**Waiver Claim**__');
        expect(msg).toContain('**Alice**');
        expect(msg).toContain('+Player One');
        expect(msg).toContain('-Player Two');
    });
});

describe('buildTradeMessage', () => {
    const players = {
        'p1': { full_name: 'Player One' },
        'p2': { first_name: 'Player', last_name: 'Two' },
    };
    const rosters = [
        { roster_id: 1, owner_id: 'user-1' },
        { roster_id: 2, owner_id: 'user-2' },
    ];
    const users = [
        { user_id: 'user-1', display_name: 'Alice' },
        { user_id: 'user-2', display_name: 'Bob' },
    ];

    test('formats trade message with players and picks', () => {
        const txn = {
            type: 'trade',
            adds: {
                'p1': 1,
                'p2': 2,
            },
            draft_picks: [
                { owner_id: 1, season: '2024', round: 1 },
            ],
        };

        const msg = buildTradeMessage(players, rosters, users, txn);
        expect(msg).toContain('__**Trade**__');
        expect(msg).toContain('**Alice**');
        expect(msg).toContain('**Bob**');
        expect(msg).toContain('Player One');
        expect(msg).toContain('Player Two');
        expect(msg).toContain('2024 1');
    });
});

