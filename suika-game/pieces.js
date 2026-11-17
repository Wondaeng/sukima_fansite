(() => {
  'use strict';

  // Contours use the original photo coordinates. Each square viewport frames
  // the particular gesture while sharing one circular collision silhouette.
  const peaceLeft = `
    M 123 765 C 111 715 130 658 167 620 C 215 572 264 541 300 503
    Q 314 472 345 452 L 365 449 Q 350 424 363 416 Q 375 410 388 437
    Q 390 400 411 355 Q 417 338 426 347 Q 433 353 427 378 L 415 429
    Q 433 402 464 385 Q 486 369 496 385 Q 503 393 491 411 L 459 459
    Q 478 448 501 443 L 509 417 Q 496 406 497 385 Q 489 369 495 357
    Q 483 337 498 312 Q 489 286 513 251 Q 526 221 554 212
    Q 570 192 585 196 L 602 179 L 601 190 Q 628 168 644 176
    L 652 167 L 653 177 Q 678 169 683 185 Q 711 194 713 219
    Q 735 244 721 260 Q 736 289 715 330 Q 718 357 701 385
    Q 695 406 682 423 Q 678 449 666 466 L 694 486
    Q 720 490 745 521 Q 768 542 776 584 L 795 782 L 797 1080
    L 220 1080 L 237 814 Q 170 810 123 765 Z`;
  const peaceRight = `
    M 721 373 Q 701 349 721 315 Q 749 271 797 245
    Q 850 211 903 216 Q 962 216 997 254 Q 1038 306 1026 370
    Q 1021 390 1003 408 L 986 423 Q 1001 439 1013 450
    Q 1034 444 1066 460 Q 1134 454 1227 521 Q 1329 591 1373 675
    Q 1393 725 1358 777 Q 1334 805 1274 791 L 1244 1080
    L 701 1080 L 724 810 Q 750 664 729 576 L 710 529
    Q 742 510 798 502 L 825 477 L 809 445 Q 747 444 721 395 Z`;
  const levels = [
    {
      name: '무대 미소', nameJa: 'ステージの笑顔', color: '#F8C957', file: 'gold', box: [0, 117, 326],
      mask: `M -15 417 Q 12 383 48 377 L 56 360 Q 46 346 45 316
        Q 35 301 43 284 Q 30 251 43 220 Q 43 180 69 168
        Q 70 153 95 148 Q 117 131 143 140 Q 166 136 180 151
        Q 202 156 209 180 Q 230 198 226 231 Q 237 252 229 279
        Q 235 288 225 309 Q 225 326 207 339 L 207 351
        Q 233 356 249 385 Q 277 388 300 408 L 323 490 L -15 490 Z`
    },
    {
      name: '페스 셀카', nameJa: 'フェスの自撮り', color: '#8CCFB5', file: 'festival', box: [750, 376, 689],
      mask: `M 1007 1088 Q 970 1038 947 964 L 922 875 L 920 849
        Q 905 858 891 843 Q 866 856 854 829 Q 831 821 844 802
        Q 823 808 810 784 L 830 785 Q 795 777 805 757 Q 789 735 808 722
        Q 779 702 802 678 Q 775 658 800 633 Q 803 607 828 603
        Q 804 582 823 568 Q 836 553 846 560 Q 838 535 868 530
        Q 853 502 889 491 Q 898 467 927 474 Q 922 451 958 448
        Q 945 425 975 418 Q 980 399 1011 414 Q 1003 394 1038 391
        Q 1056 374 1080 392 Q 1103 377 1116 388 Q 1132 374 1151 388
        Q 1165 368 1183 389 Q 1202 379 1215 397 Q 1240 382 1262 407
        Q 1294 395 1312 428 Q 1345 413 1356 448 Q 1386 444 1394 475
        Q 1426 473 1448 520 L 1455 1090 Z`
    },
    {
      name: '모은 두 손', nameJa: 'お願いポーズ', color: '#F29B88', file: 'backstage', box: [177, 217, 489],
      mask: `M 4 1000 Q 12 720 34 549 Q 38 485 82 459 Q 114 442 218 441
        L 269 431 Q 282 413 282 400 Q 272 396 274 377
        Q 276 337 289 316 Q 290 282 321 266 Q 345 248 371 257
        Q 396 242 414 255 Q 437 248 454 268 Q 488 275 495 298
        Q 508 321 503 343 Q 519 367 506 399 Q 503 433 472 455
        L 447 477 Q 455 470 452 487 Q 459 496 450 520
        L 449 539 Q 475 542 489 571 Q 499 599 498 624
        L 514 742 Q 513 809 461 852 L 436 1081 L 0 1081 Z`
    },
    {
      name: '손가락 브이', nameJa: 'ピースサイン', color: '#A3C9E9', file: 'peace',
      box: [305, 145, 456], mask: peaceLeft
    },
    {
      name: '커다란 하품', nameJa: '大あくび', color: '#EDAD63', file: 'gold', box: [381, 113, 423],
      mask: `M 390 643 Q 431 480 471 410 L 506 387 L 508 372
        Q 493 361 494 339 Q 482 332 484 320 L 495 301 L 494 281
        Q 452 266 428 243 Q 416 222 453 215 L 498 203 L 505 177
        Q 509 154 529 149 Q 550 139 576 145 Q 608 150 640 159
        Q 665 165 671 183 L 678 238 Q 718 253 736 272
        Q 745 290 726 302 Q 706 318 673 321 L 668 331
        Q 714 329 740 345 Q 800 359 856 425 L 880 720 L 390 720 Z`
    },
    {
      name: '라이브 무대', nameJa: 'ライブステージ', color: '#B5B0DE', file: 'stage', box: [436, 128, 272],
      mask: `M 443 520 L 458 383 Q 456 369 459 351 L 465 307
        Q 474 277 498 268 L 534 256 L 544 245
        Q 530 230 531 218 Q 521 204 531 175 Q 537 153 554 150
        Q 567 140 582 147 Q 597 146 604 156 Q 625 156 626 185
        Q 631 193 625 207 Q 633 211 625 225 L 619 243 Q 630 250 635 257
        Q 672 258 680 279 Q 692 309 695 353 Q 709 397 690 453
        L 679 520 Z`
    },
    {
      name: '환호', nameJa: '歓喜の声', color: '#F7D989', file: 'backstage', box: [822, 138, 537],
      mask: `M 819 764 Q 847 698 869 671 Q 823 656 827 625
        Q 829 601 848 586 Q 859 568 877 575 Q 893 573 902 589
        L 912 593 L 924 545 Q 925 540 938 542 L 980 548
        Q 990 520 1039 496 Q 1024 479 1016 457 Q 1001 432 1004 408
        Q 995 390 1000 369 L 998 340 Q 959 337 937 315 Q 926 303 948 294
        Q 975 282 1008 275 L 1035 212 Q 1046 186 1075 187
        Q 1099 187 1114 191 Q 1185 175 1213 200 L 1242 252
        Q 1271 252 1284 273 Q 1295 298 1241 312
        Q 1266 328 1242 358 L 1228 378 Q 1217 411 1225 420
        Q 1307 458 1343 508 Q 1380 558 1391 620 L 1400 790 Z`
    },
    {
      name: '20주년 타쿠야', nameJa: '20周年のタクヤ', color: '#A3C983', file: 'anniversary', box: [327, 240, 666],
      mask: `M 175 905 Q 293 794 472 775 L 472 750 Q 455 728 453 701
        Q 440 684 441 653 Q 427 640 430 617 Q 396 593 401 548
        L 398 518 L 430 517 Q 418 497 441 494 Q 424 472 432 437
        Q 441 411 465 423 L 475 388 Q 492 350 526 328
        Q 558 302 602 299 Q 623 282 653 295 Q 672 282 703 300
        Q 733 286 759 304 Q 782 291 805 321 Q 834 316 847 350
        Q 860 368 860 398 Q 884 428 880 452 Q 901 487 886 520
        Q 900 551 877 583 Q 862 615 855 648 Q 843 671 845 694
        Q 837 719 817 725 L 808 760 Q 845 780 910 801
        L 1090 932 L 1090 1110 L 175 1110 Z`
    },
    {
      name: '20주년 신타', nameJa: '20周年のシンタ', color: '#DAA5BC', file: 'anniversary', box: [1010, 14, 1054],
      mask: `M 907 1110 Q 1008 978 1238 890 Q 1215 851 1206 804
        Q 1190 738 1191 681 L 1167 625 Q 1142 618 1135 593
        Q 1104 595 1100 562 Q 1074 544 1083 524 Q 1060 490 1083 473
        Q 1060 451 1085 431 Q 1060 402 1087 380 Q 1093 350 1117 342
        Q 1104 311 1133 289 Q 1124 253 1163 236 Q 1175 203 1208 203
        Q 1207 178 1243 167 Q 1261 132 1301 149 Q 1310 119 1346 123
        Q 1365 97 1400 108 Q 1421 80 1458 94 Q 1470 66 1505 75
        Q 1538 56 1567 77 Q 1590 53 1626 79 Q 1654 56 1675 82
        Q 1706 69 1729 99 Q 1769 91 1785 117 Q 1818 112 1831 143
        Q 1858 143 1864 177 Q 1891 183 1895 218 Q 1919 241 1908 268
        Q 1931 286 1920 315 Q 1940 342 1922 373 Q 1943 399 1918 433
        L 1909 463 Q 1990 438 2053 427 L 2070 1110 Z`
    },
    {
      name: '더블 피스', nameJa: 'ダブルピース', color: '#83BDBD', file: 'peace',
      box: [331, 124, 740], mask: peaceLeft + ' ' + peaceRight
    },
    {name: '夏雲ノイズ', nameJa: '夏雲ノイズ', color: '#A6B951', file: 'album'}
  ];
  const base = document.currentScript?.src || document.baseURI;
  const images = new Map();
  const sprites = [];
  const size = 384;
  const middle = size / 2;
  const dark = '#293D32';
  const paper = '#FFFAE7';

  function circle(ctx, x, y, radius, fill) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function ring(ctx, radius, color, width) {
    ctx.beginPath();
    ctx.arc(middle, middle, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function paintRecord(ctx, photo) {
    circle(ctx, middle, middle, 187, '#26382E');
    for (let radius = 126; radius < 185; radius += 8) {
      ring(ctx, radius, '#526051', 1.8);
    }
    ctx.save();
    ctx.translate(middle, middle);
    ctx.rotate(-0.08);
    const edge = 244;
    ctx.fillStyle = paper;
    ctx.fillRect(-edge / 2 - 3, -edge / 2 - 3, edge + 6, edge + 6);
    ctx.drawImage(photo, -edge / 2, -edge / 2, edge, edge);
    ctx.restore();
  }

  function paintPortrait(ctx, level, photo) {
    const [left, top, span] = level.box;
    const path = new Path2D(level.mask);
    const scale = size / span;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-left, -top);
    ctx.lineWidth = 12 / scale;
    ctx.strokeStyle = paper;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.clip(path);
    ctx.drawImage(photo, 0, 0);
    ctx.restore();
  }

  function render(level, index, photo) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    circle(ctx, middle, middle, middle - 1, dark);
    circle(ctx, middle, middle, middle - 5, paper);
    circle(ctx, middle, middle, middle - 9, level.color);
    ctx.save();
    ctx.beginPath();
    ctx.arc(middle, middle, middle - 10, 0, 2 * Math.PI);
    ctx.clip();
    if (photo && !level.mask) {
      paintRecord(ctx, photo);
    } else if (photo) {
      ring(ctx, middle - 23, 'rgba(255,255,240,.6)', 2.1);
      paintPortrait(ctx, level, photo);
    } else {
      ctx.fillStyle = dark;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 148px system-ui, sans-serif';
      ctx.fillText(String(index + 1), middle, middle);
    }
    ctx.restore();
    return canvas;
  }

  const filenames = [...new Set(levels.map(level => level.file))];
  const ready = Promise.all(filenames.map(file => new Promise(resolve => {
    const photo = new Image();
    photo.onload = () => { images.set(file, photo); resolve(); };
    photo.onerror = () => resolve();
    photo.src = new URL('assets/' + file + '.jpg', base).href;
  }))).then(() => {
    levels.forEach((level, index) => {
      sprites[index] = render(level, index, images.get(level.file));
    });
    images.clear();
    images.clear();
  });

  function draw(ctx, level, x, y, radius, angle = 0) {
    if (!levels[level] || radius <= 0) return;
    const sprite = sprites[level] || (sprites[level] = render(levels[level], level));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  window.SuikaArt = {
    pieces: levels.map(({name, nameJa, color}) => ({name, nameJa, color})),
    ready,
    draw
  };
})();
