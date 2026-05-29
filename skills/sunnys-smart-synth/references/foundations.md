# Foundations

Use this file when the problem smells like hidden machine semantics.

## Core Questions

- What exact representation is this value using: signed, unsigned, fixed-point, floating-point, packed bits, text, or tagged data?
- What transformations are implicit: sign extension, zero extension, rounding, truncation, encoding conversion, saturation, or overflow?
- Are comparisons and arithmetic defined the way the code author assumes?

## Heuristics

- Treat numeric format as part of the API.
- Bit operations are great for compactness and masking, but they trade readability for representation coupling.
- Floating-point is approximate state, not precise decimal truth.
- Character and string choices affect size, traversal cost, conversion cost, and correctness.
- Endianness, width, and alignment assumptions become bugs at boundaries: files, protocols, FFI, serialization, SIMD, and packed data.

## Prompts to Use

- "What value range and failure mode does this representation permit?"
- "Could a narrower, wider, packed, or pre-scaled form simplify the hot path?"
- "Is the code relying on overflow, NaN behavior, or implicit conversion order?"
