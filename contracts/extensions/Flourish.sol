//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../RenderExtension.sol";

// solhint-disable quotes
contract Flourish is RenderExtension {
    address public constant SALT = 0x2e957bd48919Ea12eFc7cb4fe7199040181cDDfa;

    string private constant PATH_START = ' C 175 250, 312 194, 175 350" ';
    string private constant PATH_START_MIRROR = ' C 175 250, 38 194, 175 350" ';
    string private constant PATH_END_WHITE = 'stroke="white" fill="white"></path>';
    string private constant SPACE = " ";
    string private constant SPACED_COMMA = " , ";
    string private constant PATH_D = '<path d="';
    string private constant S_START = "S ";
    string private constant GRADIENT_STROKE = 'stroke="url(#grad';
    string private constant FILL_GRADIENT = ')" fill="url(#grad';
    string private constant PATH_END = ')"></path>';
    string private constant M_START = "M 175 0 ";

    string[] private gradientNames = ["Moonlit Asteriod", "Witching Hour", "Purple Bliss", "Neon Life", "Day Tripper", "Harmonic Energy", "Zinc"];
    uint16[3][][7] private gradients;
    uint16 private constant numOfGradients = 7;

    constructor() {
        gradients[0] = [[uint16(15), uint16(32), uint16(39)], [uint16(32), uint16(58), uint16(67)], [uint16(44), uint16(83), uint16(100)]];
        gradients[1] = [[uint16(195), uint16(20), uint16(50)], [uint16(36), uint16(11), uint16(54)]];
        gradients[2] = [[uint16(54), uint16(0), uint16(51)], [uint16(11), uint16(135), uint16(147)]];
        gradients[3] = [[uint16(179), uint16(255), uint16(171)], [uint16(18), uint16(255), uint16(247)]];
        gradients[4] = [[uint16(248), uint16(87), uint16(166)], [uint16(255), uint16(88), uint16(88)]];
        gradients[5] = [[uint16(22), uint16(160), uint16(133)], [uint16(244), uint16(208), uint16(63)]];
        gradients[6] = [[uint16(173), uint16(169), uint16(150)], [uint16(242), uint16(242), uint16(242)], [uint16(219), uint16(219), uint16(219)], [uint16(234), uint16(234), uint16(234)]];
    }

    struct RandSet {
        bytes32 set;
        uint16 gradientIx;
    }

    struct RandomSets {
        RandSet rand1;
        RandSet rand2;
        RandSet rand3;
        RandSet rand4;
    }

    struct Counts {
        uint256 ix;
        uint256 ixx;
        uint256 layers;
        uint256 steps;
    }

    struct Paths {
        string left1;
        string left2;
        string right1;
        string right2;
    }

    function _getCounts(uint256 tokenId) private view returns (Counts memory) {
        uint256 ix = random(string(abi.encodePacked(toString(tokenId), address(this))));
        uint256 ixx = random(string(abi.encodePacked(toString(tokenId), toString(ix), address(this))));

        uint256 l = ix % 7;
        uint256 s = ixx % 7;
        if (l == 0) {
            l = 1;
        }
        if (s < 2) {
            s = 2;
        }

        return Counts({ix: ix, ixx: ixx, layers: l, steps: s});
    }

    function _getRandomSets(uint256 tokenId, uint256 layer) private view returns (RandomSets memory) {
        return RandomSets({rand1: getRandSet(1, tokenId, layer), rand2: getRandSet(2, tokenId, layer), rand3: getRandSet(3, tokenId, layer), rand4: getRandSet(4, tokenId, layer)});
    }

    function generate(uint256 tokenId, uint256) external view override returns (GenerateResult memory generateResult) {
        Counts memory cts = _getCounts(tokenId);
        string memory total = string(abi.encodePacked("<style>svg{width:350px;height:350px;}</style>"));

        uint256[7] memory gradientsUsed;

        for (uint256 layer = 0; layer < cts.layers; layer++) {
            RandomSets memory sets = _getRandomSets(tokenId, layer);

            total = string(abi.encodePacked(total, _linearGradient(uint16(layer), sets.rand2.gradientIx)));
            gradientsUsed[sets.rand2.gradientIx] = gradientsUsed[sets.rand2.gradientIx] + 1;

            Paths memory paths = Paths({left1: M_START, left2: M_START, right1: M_START, right2: M_START});

            for (uint256 step = 0; step < cts.steps; step++) {
                paths.left1 = string(abi.encodePacked(paths.left1, S_START, getNum(cts.ix, step, layer, sets.rand1)));
                paths.left1 = string(
                    abi.encodePacked(paths.left1, SPACE, getNum(cts.ix, step, layer, sets.rand2), SPACED_COMMA, getNum(cts.ix, step, layer, sets.rand3), SPACE, getNum(cts.ix, step, layer, sets.rand4))
                );
                paths.right1 = string(abi.encodePacked(paths.right1, S_START, getNumMirror(cts.ix, step, layer, sets.rand1), SPACE));
                paths.right1 = string(
                    abi.encodePacked(paths.right1, getNum(cts.ix, step, layer, sets.rand2), SPACED_COMMA, getNumMirror(cts.ix, step, layer, sets.rand3), SPACE, getNum(cts.ix, step, layer, sets.rand4))
                );
                paths.left2 = string(abi.encodePacked(paths.left2, S_START, getNum(cts.ix, step, layer, sets.rand2), SPACE));
                paths.left2 = string(
                    abi.encodePacked(paths.left2, getNum(cts.ix, step, layer, sets.rand1), SPACED_COMMA, getNum(cts.ix, step, layer, sets.rand3), SPACE, getNum(cts.ix, step, layer, sets.rand4))
                );
                paths.right2 = string(abi.encodePacked(paths.right2, S_START, getNumMirror(cts.ix, step, layer, sets.rand2), SPACE));
                paths.right2 = string(
                    abi.encodePacked(paths.right2, getNum(cts.ix, step, layer, sets.rand1), SPACED_COMMA, getNumMirror(cts.ix, step, layer, sets.rand3), SPACE, getNum(cts.ix, step, layer, sets.rand4))
                );
            }

            total = string(abi.encodePacked(total, PATH_D, paths.left1, PATH_START, PATH_END_WHITE));
            total = string(abi.encodePacked(total, PATH_D, paths.right1, PATH_START_MIRROR, PATH_END_WHITE));
            total = string(abi.encodePacked(total, PATH_D, paths.left2, PATH_START, GRADIENT_STROKE));
            total = string(abi.encodePacked(total, toString(layer), FILL_GRADIENT, toString(layer), PATH_END));
            total = string(abi.encodePacked(total, PATH_D, paths.right2, PATH_START_MIRROR, GRADIENT_STROKE));
            total = string(abi.encodePacked(total, toString(layer), FILL_GRADIENT, toString(layer), PATH_END));
        }

        string memory attrOutput;
        for (uint256 a = 0; a < numOfGradients; a++) {
            if (gradientsUsed[a] > 0) {
                attrOutput = string(abi.encodePacked(attrOutput, ',{"trait_type":"', gradientNames[a], '","value":"', toString(gradientsUsed[a]), '"}'));
            }
        }
        attrOutput = string(abi.encodePacked(attrOutput, ',{"trait_type":"Layers","value":"', toString(cts.layers), '"}'));
        attrOutput = string(abi.encodePacked(attrOutput, ',{"trait_type":"Steps","value":"', toString(cts.steps), '"}'));

        generateResult = GenerateResult({svgPart: total, attributes: attrOutput});
    }

    function _linearGradient(uint16 i, uint16 g) internal view returns (string memory) {
        string memory s = string(abi.encodePacked('<linearGradient id="grad', toString(i), '" x1="0%" y1="0%" x2="100%" y2="0%">'));

        uint256 offset = 0;
        for (uint16 ix = 0; ix < gradients[g].length; ix++) {
            s = string(abi.encodePacked(s, '<stop offset="', toString(offset), '%" style="stop-color:rgb(', toString(gradients[g][ix][0]), ","));
            s = string(abi.encodePacked(s, toString(gradients[g][ix][1]), ",", toString(gradients[g][ix][2]), ');stop-opacity:1" />'));

            offset = offset + 100 / (gradients[g].length - 1);
        }
        s = string(abi.encodePacked(s, "</linearGradient>"));

        return s;
    }

    function getNum(
        uint256 ix,
        uint256 step,
        uint256 layer,
        RandSet memory randSet
    ) internal pure returns (string memory) {
        return toString(_rangeNum(ix, step, layer, randSet));
    }

    function getNumMirror(
        uint256 ix,
        uint256 step,
        uint256 layer,
        RandSet memory randSet
    ) internal pure returns (string memory) {
        return toString(350 - _rangeNum(ix, step, layer, randSet));
    }

    function _rangeNum(
        uint256 ix,
        uint256 step,
        uint256 layer,
        RandSet memory randSet
    ) internal pure returns (uint16) {
        return uint16(numAtIndex(randSet.set, (ix + layer + step) % randSet.set.length) % 350);
    }

    function getRandSet(
        uint256 ix,
        uint256 tokenId,
        uint256 layer
    ) internal view returns (RandSet memory) {
        string memory r = string(abi.encodePacked(toString(tokenId), toString(ix), toString(layer), address(this), SALT));
        uint16 gradientIx = uint16(random(r) % numOfGradients);
        bytes32 rand = randomBytes(r);
        return RandSet({set: rand, gradientIx: gradientIx});
    }

    function randomBytes(string memory input) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(input));
    }

    function numAtIndex(bytes32 input, uint256 index) internal pure returns (uint8) {
        return uint8(input[index]);
    }

    function random(string memory input) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }

    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT license
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
