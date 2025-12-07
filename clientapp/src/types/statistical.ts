
export interface statisticalResponse {
    status: number;
    message: string;
    data: number
}

export type MessageCountByDay = {
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
};

export type WeeklyMessageData = {
    group: MessageCountByDay;
    personal: MessageCountByDay;
};

export type WeeklyMessageResponse = {
    status: number;
    message: string;
    data: WeeklyMessageData;
};


export type MonthlyUserStat = {
    jan: number;
    feb: number;
    mar: number;
    apr: number;
    may: number;
    jun: number;
    jul: number;
    aug: number;
    sep: number;
    oct: number;
    nov: number;
    dec: number;
};

export type MonthlyUserStatResponse = {
    status: number;
    message: string;
    data: MonthlyUserStat;
};
