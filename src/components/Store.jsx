import { STORE_ITEMS, MAX_EQUIPPED } from '../game/store';

export default function Store({ player, inventory, onBuy, onEquip, onClose }) {
  const ownedIds = new Set(inventory.map((row) => row.item_id));
  const equipped = player.equipped || [];

  function buy(item) {
    if (ownedIds.has(item.id) || player.scrap < item.cost) return;
    onBuy(item.id, item.cost);
  }

  function toggleEquip(id) {
    const next = equipped.includes(id)
      ? equipped.filter((x) => x !== id)
      : [...equipped, id].slice(-MAX_EQUIPPED);
    onEquip(next);
  }

  return (
    <div className="overlay">
      <div className="card card-wide">
        <div className="store-header">
          <div>
            <h1>Quartermaster</h1>
            <p className="sub">Buy permanent upgrades. Equip up to {MAX_EQUIPPED} at a time.</p>
          </div>
          <div className="scrap-pill" data-testid="store-scrap">
            <span className="scrap-icon">⛯</span>
            <strong>{player.scrap}</strong>
            <span>scrap</span>
          </div>
        </div>

        <div className="store-section-title">Weapons</div>
        <div className="store-grid">
          {STORE_ITEMS.filter((i) => i.kind === 'weapon').map((item) => (
            <StoreCard
              key={item.id}
              item={item}
              owned={ownedIds.has(item.id)}
              equipped={equipped.includes(item.id)}
              canAfford={player.scrap >= item.cost}
              onBuy={() => buy(item)}
              onEquip={() => toggleEquip(item.id)}
            />
          ))}
        </div>

        <div className="store-section-title">Power-Ups</div>
        <div className="store-grid">
          {STORE_ITEMS.filter((i) => i.kind === 'powerup').map((item) => (
            <StoreCard
              key={item.id}
              item={item}
              owned={ownedIds.has(item.id)}
              equipped={equipped.includes(item.id)}
              canAfford={player.scrap >= item.cost}
              onBuy={() => buy(item)}
              onEquip={() => toggleEquip(item.id)}
            />
          ))}
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn ghost" onClick={onClose} data-testid="store-close">Close</button>
        </div>
      </div>
    </div>
  );
}

function StoreCard({ item, owned, equipped, canAfford, onBuy, onEquip }) {
  return (
    <div className={`store-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`} data-testid={`store-item-${item.id}`}>
      <div className="store-card-head">
        <span className="store-emblem" style={{ color: item.color }}>{item.emblem}</span>
        <div>
          <div className="store-name">{item.name}</div>
          <div className="store-cost">⛯ {item.cost}</div>
        </div>
      </div>
      <p className="store-desc">{item.description}</p>
      {owned ? (
        <button
          className={`btn ${equipped ? '' : 'ghost'}`}
          onClick={onEquip}
          data-testid={`equip-${item.id}`}
        >
          {equipped ? 'Equipped ✓' : 'Equip'}
        </button>
      ) : (
        <button
          className="btn"
          onClick={onBuy}
          disabled={!canAfford}
          data-testid={`buy-${item.id}`}
        >
          {canAfford ? 'Buy' : 'Not enough scrap'}
        </button>
      )}
    </div>
  );
}
