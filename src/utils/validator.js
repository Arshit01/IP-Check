// CIDR Check Helper (IPv4)
function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function inCidr(ip, cidr) {
    const [range, bits] = cidr.split('/');
    const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);
    return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

// CIDR Check Helper (IPv6 - BigInt)
function ipv6ToBigInt(ip) {
    // Expand ::
    let expanded = ip;
    if (ip.includes('::')) {
        const parts = ip.split('::');
        const left = parts[0].split(':').filter(p => p);
        const right = parts[1].split(':').filter(p => p);
        const missing = 8 - (left.length + right.length);
        const zeros = Array(missing).fill('0');
        expanded = [...left, ...zeros, ...right].join(':');
    } else {

    }

    // Robust expansion:
    const parts = ip.split(':');
    let fullParts = [];

    // Find double colon index
    const doubleColonIndex = ip.indexOf('::');

    if (doubleColonIndex !== -1) {
        const pre = ip.substring(0, doubleColonIndex).split(':').filter(Boolean);
        const post = ip.substring(doubleColonIndex + 2).split(':').filter(Boolean);
        const count = 8 - pre.length - post.length;
        fullParts = [...pre, ...Array(count).fill('0'), ...post];
    } else {
        fullParts = parts;
    }

    let bigInt = 0n;
    for (const part of fullParts) {
        bigInt = (bigInt << 16n) + BigInt(parseInt(part || '0', 16));
    }
    return bigInt;
}

function inCidr6(ip, cidr) {
    try {
        const [range, bitsStr] = cidr.split('/');
        const bits = BigInt(bitsStr);
        const ipBig = ipv6ToBigInt(ip);
        const rangeBig = ipv6ToBigInt(range);

        const shiftAndParams = 128n - bits;
        const mask = (galleryVal = (1n << 128n) - 1n) ^ ((1n << shiftAndParams) - 1n);

        const maskVal = ((1n << bits) - 1n) << (128n - bits);

        return (ipBig & maskVal) === (rangeBig & maskVal);
    } catch (e) {
        return false;
    }
}

// IPv4 Exclusions Table
const IPV4_EXCLUSIONS = [
    { cidr: '0.0.0.0/8', type: 'private', category: 'This Network' },
    { cidr: '10.0.0.0/8', type: 'private', category: 'Private IP' },
    { cidr: '100.64.0.0/10', type: 'private', category: 'Carrier-Grade NAT' },
    { cidr: '127.0.0.0/8', type: 'private', category: 'Loopback Address' },
    { cidr: '169.254.0.0/16', type: 'private', category: 'Link-Local Address' },
    { cidr: '172.16.0.0/12', type: 'private', category: 'Private IP' },
    { cidr: '192.168.0.0/16', type: 'private', category: 'Private IP' },
    { cidr: '192.0.2.0/24', type: 'private', category: 'Documentation (TEST-NET)' },
    { cidr: '198.18.0.0/15', type: 'private', category: 'Benchmarking' },
    { cidr: '198.51.100.0/24', type: 'private', category: 'Documentation (TEST-NET)' },
    { cidr: '203.0.113.0/24', type: 'private', category: 'Documentation (TEST-NET)' },
    { cidr: '224.0.0.0/4', type: 'private', category: 'Multicast Address' },
    { cidr: '240.0.0.0/4', type: 'private', category: 'Reserved / Future Use' }
];

// IPv6 Exclusions Table
const IPV6_EXCLUSIONS = [
    { cidr: '::/128', type: 'private', category: 'Unspecified' },
    { cidr: '::1/128', type: 'private', category: 'Loopback Address' },
    { cidr: 'fc00::/7', type: 'private', category: 'Unique Local Address' },
    { cidr: 'fe80::/10', type: 'private', category: 'Link-Local Address' },
    { cidr: 'ff00::/8', type: 'private', category: 'Multicast Address' },
    { cidr: '2001:db8::/32', type: 'private', category: 'Documentation Address' },
    { cidr: '2001:2::/48', type: 'private', category: 'Benchmarking' },
    { cidr: '::ffff:0:0/96', type: 'private', category: 'IPv4-Mapped IPv6' },
    { cidr: '0000::/8', type: 'private', category: 'Reserved' },
    { cidr: '100::/64', type: 'private', category: 'Discard Prefix' }
];

export function getIpType(text) {
    if (!text) return { valid: false, type: 'invalid' };
    const clean = text.trim();

    // IPv4 Check
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) {
        const parts = clean.split('.').map(Number);
        if (parts.some(p => p > 255 || p < 0)) return { valid: false, type: 'invalid' };

        // Check against exclusions
        for (const entry of IPV4_EXCLUSIONS) {
            if (inCidr(clean, entry.cidr)) {
                return { valid: true, type: entry.type, category: entry.category };
            }
        }

        return { valid: true, type: 'public', category: 'Public IP' };
    }

    // IPv6 Check
    if (clean.includes(':')) {
        // Basic Regex for Structure (loose check)
        const isIPv6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/.test(clean);

        if (!isIPv6) return { valid: false, type: 'invalid' };

        // Exclusions
        for (const entry of IPV6_EXCLUSIONS) {
            if (inCidr6(clean, entry.cidr)) {
                return { valid: true, type: entry.type, category: entry.category };
            }
        }

        return { valid: true, type: 'public', category: 'Public IPv6' };
    }

    return { valid: false, type: 'invalid' };
}


export function isValidIp(text) {
    const result = getIpType(text);
    return result.valid && result.type === 'public';
}
