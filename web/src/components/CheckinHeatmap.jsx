import { useEffect, useRef, useState } from 'react';
import { Box, Flex, HStack, VStack } from '@chakra-ui/react';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Maj',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec',
];

// Week starts on Monday (Swedish convention). Show every other label.
const WEEKDAY_LABELS = ['Mån', '', 'Ons', '', 'Fre', '', 'Sön'];

const GAP = 4;
const LABEL_COL = 32;
const LABEL_PR = 6;
const MIN_CELL = 12;
const MAX_CELL = 28;
// Small buffer so rounding never pushes the grid past its container.
const SAFETY = 8;

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function buildWeeks(start, end) {
  const weeks = [];
  // Convert Sunday-based getUTCDay (0=Sun) to Monday-based (0=Mon).
  const leadingOffset = (start.getUTCDay() + 6) % 7;

  let current = [];
  for (let i = 0; i < leadingOffset; i += 1) {
    current.push(null);
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    const date = `${cursor.getUTCFullYear()}-${pad2(
      cursor.getUTCMonth() + 1,
    )}-${pad2(cursor.getUTCDate())}`;
    current.push({ date, month: cursor.getUTCMonth() });
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (current.length > 0) {
    while (current.length < 7) {
      current.push(null);
    }
    weeks.push(current);
  }

  return weeks;
}

function monthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  for (const week of weeks) {
    const firstDay = week.find((cell) => cell);
    if (firstDay && firstDay.month !== lastMonth) {
      labels.push(MONTH_LABELS[firstDay.month]);
      lastMonth = firstDay.month;
    } else {
      labels.push('');
    }
  }
  return labels;
}

function tooltipLabel(date, active) {
  return active ? `Tränade ${date}` : `Ingen träning ${date}`;
}

export default function CheckinHeatmap({ year, quarter, entries = [], today }) {
  const rootRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return undefined;
    }
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeDates = new Set(entries.map((entry) => entry.date));
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  const weeks = buildWeeks(start, end);
  const labels = monthLabels(weeks);
  const numCols = weeks.length || 1;

  const available = (width || 320) - LABEL_COL - LABEL_PR - SAFETY;
  const rawCell = (available - (numCols - 1) * GAP) / numCols;
  const cell = clamp(Math.floor(rawCell), MIN_CELL, MAX_CELL);
  const radius = `${Math.max(2, Math.round(cell * 0.18))}px`;

  const cellPx = `${cell}px`;
  const gapPx = `${GAP}px`;
  const pitchPx = `${cell + GAP}px`;
  const labelFont = `${clamp(Math.round(cell * 0.5), 9, 11)}px`;

  return (
    <Box ref={rootRef} w="full" overflowX="auto">
      <Flex direction="column" align="center">
        <Box minW="max-content">
          <Flex pl={`${LABEL_COL + LABEL_PR}px`} mb="4px">
            {labels.map((label, index) => (
              <Box
                // eslint-disable-next-line react/no-array-index-key
                key={`m-${index}`}
                w={pitchPx}
                flexShrink={0}
                fontSize={labelFont}
                color="gray.500"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {label}
              </Box>
            ))}
          </Flex>

          <Flex align="flex-start">
            <VStack
              spacing={gapPx}
              align="flex-end"
              w={`${LABEL_COL}px`}
              pr={`${LABEL_PR}px`}
              flexShrink={0}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <Box
                  // eslint-disable-next-line react/no-array-index-key
                  key={`w-${index}`}
                  h={cellPx}
                  fontSize={labelFont}
                  color="gray.500"
                  lineHeight={cellPx}
                >
                  {label}
                </Box>
              ))}
            </VStack>

            <HStack spacing={gapPx} align="flex-start">
              {weeks.map((week, weekIndex) => (
                <VStack
                  // eslint-disable-next-line react/no-array-index-key
                  key={`week-${weekIndex}`}
                  spacing={gapPx}
                >
                  {week.map((cellData, dayIndex) => {
                    if (!cellData) {
                      return (
                        <Box
                          // eslint-disable-next-line react/no-array-index-key
                          key={`empty-${weekIndex}-${dayIndex}`}
                          boxSize={cellPx}
                          bg="transparent"
                        />
                      );
                    }
                    const active = activeDates.has(cellData.date);
                    const isToday = today && cellData.date === today;
                    return (
                      <Box
                        key={cellData.date}
                        boxSize={cellPx}
                        borderRadius={radius}
                        bg={active ? 'teal.400' : 'gray.100'}
                        borderWidth={isToday ? '1px' : '0'}
                        borderColor="teal.700"
                        title={tooltipLabel(cellData.date, active)}
                      />
                    );
                  })}
                </VStack>
              ))}
            </HStack>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
