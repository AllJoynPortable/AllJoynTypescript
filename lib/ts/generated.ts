namespace AJ {

    //==============================================================================================================
    // FIXED IMPLEMENTATION BELOW
    //==============================================================================================================

    enum Endianness {
        LittleEndian,
        BigEndian
    };

    export enum MsgType {
        MethodCall,
        MethodReturn,
        Error,
        Signal,

        Unknown
    }

    enum FieldType {
        Path = 1,
        Interface = 2,
        Member = 3,
        ErrorName = 4,
        ReplySerial = 5,
        Destination = 6,
        Sender = 7,
        Signature = 8
    }

    export class MsgGeneric {

        /* ------------------------------------------------------------------------------------------------------- */
        /*  CONSTRUCTORS                                                                                           */
        /* ------------------------------------------------------------------------------------------------------- */

        constructor(t: MsgType) {
            // just small buffer initially

            if (t != MsgType.Unknown) {
                this.m_Data = new Uint8Array(128);

                this.hdr_SetEndianness(Endianness.LittleEndian);
                this.hdr_SetMsgType(t);
                this.hdr_SetMajorVersion(0x00);
                this.hdr_SetBodyLength(0);
                this.hdr_SetHeaderLength(0);
                this.hdr_SetSerialNumber(MsgGeneric.m_NextSerialNumber++);
            }
            else {
                this.m_Data = null;
            }
        }

        public FromBuffer(bytes: Uint8Array): number {
            if (bytes.length >= 16) {
                console.log(bytes);
                this.m_Data = bytes;
                var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
                console.log("length : " + length);
                if ((bytes.length >= length) && (length < 1024)) {
                    this.m_Data = new Uint8Array(length);
                    if (bytes.length == length) {
                        this.m_Data.set(bytes);
                    } else {
                        this.m_Data.set(bytes.subarray(0, length));
                    }
                    return length;
                }
            }
            this.m_Data = null;
            return 0;
        }

        public CreateReply() {
            this.m_Reply = new MsgGeneric(MsgType.MethodReturn);

            this.m_Reply.hdr_SetDestination(this.hdr_GetSender());
            this.m_Reply.hdr_SetSender(this.hdr_GetDestination());
            this.m_Reply.hdr_SetReplySerial(this.hdr_GetSerialNumber());
        }

        /* ------------------------------------------------------------------------------------------------------- */
        /*  PUBLIC MESSAGE HEADERS INTERFACE                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */

        public hdr_GetEndianness(): Endianness {
            return (this.m_Data[0] == 0x6c) ? Endianness.LittleEndian : Endianness.BigEndian;
        }

        public hdr_SetEndianness(value: Endianness) {
            if (value == Endianness.LittleEndian) this.m_Data[0] = 0x6c;
            else this.m_Data[0] = 0x42;
        }

        public hdr_GetMsgType(): MsgType {
            if (this.m_Data.length >= 16) {
                switch (this.m_Data[1]) {
                    case 0: return MsgType.Unknown;
                    case 1: return MsgType.MethodCall;
                    case 2: return MsgType.MethodReturn;
                    case 3: return MsgType.Error;
                    case 4: return MsgType.Signal;
                }
            }

            return MsgType.Unknown;
        }

        public hdr_SetMsgType(value: MsgType) {
            switch (value) {
                case MsgType.MethodCall: this.m_Data[1] = 1; break;
                case MsgType.MethodReturn: this.m_Data[1] = 2; break;
                case MsgType.Error: this.m_Data[1] = 3; break;
                case MsgType.Signal: this.m_Data[1] = 4; break;
                default: this.m_Data[1] = 0; break;
            }
        }

        public hdr_GetNoReplyExpected(): boolean {
            return (0 != (this.m_Data[2] & 0x01));
        }

        public hdr_SetNoReplyExpected(value: boolean) {
            if (value) this.SetFlag(0x01); else this.ClearFlag(0x01);
        }

        public hdr_GetAutoStart(): boolean {
            return (0 != (this.m_Data[2] & 0x02));
        }

        public hdr_SetAutoStart(value: boolean) {
            if (value) this.SetFlag(0x02); else this.ClearFlag(0x02);
        }

        public hdr_GetAllowRemoteMsg(): boolean {
            return (0 != (this.m_Data[2] & 0x04));
        }

        public hdr_SetAllowRemoteMsg(value: boolean) {
            if (value) this.SetFlag(0x04); else this.ClearFlag(0x04);
        }

        public hdr_GetSessionless(): boolean {
            return (0 != (this.m_Data[2] & 0x10));
        }

        public hdr_SetSessionless(value: boolean) {
            if (value) this.SetFlag(0x10); else this.ClearFlag(0x10);
        }

        public hdr_GetGlobalBroadcast(): boolean {
            return (0 != (this.m_Data[2] & 0x20));
        }

        public hdr_SetGlobalBroadcast(value: boolean) {
            if (value) this.SetFlag(0x20); else this.ClearFlag(0x20);
        }

        public hdr_GetCompressed(): boolean {
            return (0 != (this.m_Data[2] & 0x40));
        }

        public hdr_SetCompressed(value: boolean) {
            if (value) this.SetFlag(0x40); else this.ClearFlag(0x40);
        }

        public hdr_GetEncrypted(): boolean {
            return (0 != (this.m_Data[2] & 0x80));
        }

        public hdr_SetEncrypted(value: boolean) {
            if (value) this.SetFlag(0x80); else this.ClearFlag(0x80);
        }


        public hdr_GetMajorVersion(): number {
            return this.m_Data[3];
        }

        public hdr_SetMajorVersion(value: number) {
            this.m_Data[3] = value;
        }

        public hdr_GetBodyLength(): number {
            return this.GetUintAt(4);
        }

        public hdr_SetBodyLength(value: number) {
            this.SetUintAt(4, value);
        }

        public hdr_GetSerialNumber(): number {
            return this.GetUintAt(8);
        }

        public hdr_SetSerialNumber(value: number) {
            this.SetUintAt(8, value);
        }

        public hdr_GetHeaderLength(): number {
            return this.GetUintAt(12);
        }

        public hdr_SetHeaderLength(value: number) {
            this.SetUintAt(12, value);
        }

        public hdr_GetObjectPath(): string {
            return this._ExtractFieldFromHeader(FieldType.Path);
        }

        public hdr_SetObjectPath(value: string) {
            this.AddField(FieldType.Path, value);
        }

        public hdr_GetInterface(): string {
            return this._ExtractFieldFromHeader(FieldType.Interface);
        }

        public hdr_SetInterface(value: string) {
            this.AddField(FieldType.Interface, value);
        }

        public hdr_GetMember(): string {
            return this._ExtractFieldFromHeader(FieldType.Member);
        }

        public hdr_SetMember(value: string) {
            this.AddField(FieldType.Member, value);
        }

        public hdr_GetDestination(): string {
            return this._ExtractFieldFromHeader(FieldType.Destination);
        }

        public hdr_SetDestination(value: string) {
            this.AddField(FieldType.Destination, value);
        }

        public hdr_GetSender(): string {
            return this._ExtractFieldFromHeader(FieldType.Sender);
        }

        public hdr_SetSender(value: string) {
            this.AddField(FieldType.Sender, value);
        }

        public hdr_GetReplySerial(): number {
            var o: any = this._ExtractFieldFromHeader(FieldType.ReplySerial);
            return (null != o) ? o : 0;
        }

        public hdr_SetReplySerial(value: number) {
            this.AddField(FieldType.ReplySerial, value);
        }

        public hdr_GetSignature(): string {
            return this._ExtractFieldFromHeader(FieldType.Signature);
        }

        public hdr_SetSignature(value: string) {
            this.AddField(FieldType.Signature, value);
        }

        public hdr_GetErrorName(): string {
            return this._ExtractFieldFromHeader(FieldType.ErrorName);
        }

        public hdr_SetErrorName(value: string) {
            this.AddField(FieldType.ErrorName, value);
        }

        /* ------------------------------------------------------------------------------------------------------- */
        /*  WRITING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        public body_StartWriting() {
            this.m_WritingBody = true;
            this.m_position = 16 + this.RoundedHeaderLength();
        }

        public body_Write_Y(v: number) {
            this.EnsureBufferSize(1);
            this.SetByteAt(this.m_position++, v);
            this.body_UpdateLength();
        }

        public body_Write_B(v: boolean) {
            this.body_Write_I(v ? 1 : 0);
        }

        public body_Write_N(v: number) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);

            this.m_position += 2;

            this.body_UpdateLength();
        }

        public body_Write_Q(v: number) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);

            this.m_position += 2;

            this.body_UpdateLength();
        }

        public body_Write_I(v: number) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);

            this.m_position += 4;

            this.body_UpdateLength();
        }

        public body_Write_U(v: number) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);

            this.m_position += 4;

            this.body_UpdateLength();
        }

        public body_Write_S(v: string) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4 + 1);

            this.SetUintAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 4, v);

            this.m_position += 4 + v.length + 1;

            this.body_UpdateLength();
        }

        public body_Write_O(v: string) {
            this.body_Write_S(v);
        }

        public body_Write_G(v: string) {
            this.EnsureBufferSize(1 + v.length + 1);

            this.SetByteAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 1, v);

            this.m_position += 1 + v.length + 1;

            this.body_UpdateLength();
        }

        public body_Write_AY(v: Uint8Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4);

            this.SetUintAt(this.m_position, v.length);
            this.SetBytesAt(this.m_position + 4, v);

            this.m_position += 4 + v.length;

            this.body_UpdateLength();
        }

        public body_Write_AN(v: Int16Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);

            this.body_Write_U(v.length * 2);

            for (var i: number = 0; i < v.length; i++) {
                // XXX - make sure it's converted correctly
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }

            this.m_position += v.length * 2;

            this.body_UpdateLength();
        }

        public body_Write_AQ(v: Uint16Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);

            this.body_Write_U(v.length * 2);

            for (var i: number = 0; i < v.length; i++) {
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }

            this.m_position += v.length * 2;

            this.body_UpdateLength();
        }

        public body_Write_AI(v: Int32Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);

            this.body_Write_U(v.length * 4);

            for (var i: number = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }

            this.m_position += v.length * 4;

            this.body_UpdateLength();
        }

        public body_Write_AU(v: Uint32Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);

            this.body_Write_U(v.length * 4);

            for (var i: number = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }

            this.m_position += v.length * 4;

            this.body_UpdateLength();
        }

        public body_Write_R_Start() {
            this.Align(8);
        }

        private m_array_nesting = -1;
        private m_array_position: Array<number> = new Array<number>(10);

        public body_Write_A_Start() {
            this.Align(4); // XXX - is this correct?

            // store beginning of the array position
            this.m_array_position[++this.m_array_nesting] = this.m_position;

            // and write array size, for now it's going to be 0
            this.body_Write_U(0);
        }

        public body_Write_A_End(eight_byte_padding: boolean) {
            // XXX - take care about element alignment
            var temp_position: number = this.m_position;
            var padding_offset: number = 0;

            /* go back to the beginning of the array, so we can write size */
            this.m_position = this.m_array_position[this.m_array_nesting];

            if (eight_byte_padding) {
                if ((this.m_position + 4) % 8 != 0)
                    padding_offset = 4;
            }

            /* calculate array size */
            this.SetUintAt(this.m_position, temp_position - (this.m_array_position[this.m_array_nesting] + 4 + padding_offset));

            /* restore position */
            this.m_position = temp_position;
            this.m_array_nesting--;
        }

        public body_Write_V(v: any, sig: string) {
            this.body_Write_G(sig);
            this.body_WriteObject(sig, v);
        }

        public body_WriteRaw(data: Uint8Array) {
            this.EnsureBufferSize(data.length);
            this.SetBytesAt(this.m_position, data);
            this.m_position += data.length;
            this.body_UpdateLength();
        }

        public body_WriteObject(sig: string, v: any) {
            switch (sig) {
                case "s":
                case "o":
                    this.body_Write_S(v);
                    return;
                case "g": this.body_Write_G(v); return;
                case "b": this.body_Write_B(v); return;
                case "y": this.body_Write_Y(v); return;
                case "n": this.body_Write_N(v); return;
                case "q": this.body_Write_Q(v); return;
                case "i": this.body_Write_I(v); return;
                case "u": this.body_Write_U(v); return;
                case "ay": this.body_Write_AY(v); return;
                case "an": this.body_Write_AN(v); return;
                case "aq": this.body_Write_AQ(v); return;
                case "ai": this.body_Write_AI(v); return;
                case "au": this.body_Write_AU(v); return;
            }

            if (sig[0] == 'a') {
                this.body_Write_A_Start();

                if (sig[1] == '{') {
                    var d: Array<any> = v;

                    for (var k of d) {
                        this.body_WriteObject(this.GetSubSignature(sig, 1), k);
                    }
                }
                else {
                    var l: Array<any> = v;

                    for (var o of l) {
                        this.body_WriteObject(this.GetSubSignature(sig, 1), o);
                    }
                }

                this.body_Write_A_End((sig[1] == '{') || (sig[1] == '('));
            }
            else if (sig[0] == '{') {
                // XXX - keyvalue pair will be array with 2 elemenst for now
                var kv: Array<any> = v as Array<any>;

                this.Align(8);

                var ss: string = this.GetSubSignature(sig, 1);
                this.body_WriteObject(ss, kv[0]);
                ss = this.GetSubSignature(sig, 1 + ss.length);
                this.body_WriteObject(ss, kv[1]);
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var idx: number = 1;

                for (var o of (v as Array<any>)) {
                    var ss: string = this.GetSubSignature(sig, idx);
                    idx += ss.length;
                    this.body_WriteObject(ss, o);
                }
            }
            else if (sig == "v") {
                if (typeof (v) == "string") {
                    this.body_Write_V(v, "s");
                }
                else {
                    this.body_Write_V("DUPA!!!!", "s");
                }
            }
        }

        private body_UpdateLength() {
            if (this.m_WritingBody) {
                this.hdr_SetBodyLength(this.m_position - (16 + this.RoundedHeaderLength()));
            }
        }

        public body_Write_AS(v: Array<any>) {
            this.body_Write_A_Start();
            for (var k of v) this.body_Write_S(k);
            this.body_Write_A_End(false);
        };


        public body_Write_ROAS(v: Array<any>) {
            this.Align(8);
            this.body_Write_O(v[0]);
            this.body_Write_AS(v[1]);
        };


        public body_Write_AROAS(v: Array<any>) {
            this.body_Write_A_Start();
            for (var k of v) this.body_Write_ROAS(k);
            this.body_Write_A_End(true);
        };




        /* ------------------------------------------------------------------------------------------------------- */
        /*  READING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        public body_StartReading() {
            this.m_position = 16 + this.RoundedHeaderLength();
        }

        public body_Read_Y(): number {
            return this.GetByteAt(this.m_position++);
        }

        public body_Read_B(): boolean {
            return (0 != this.body_Read_I());
        }

        public body_Read_N(): number {
            this.Align(2);

            var ret: number = this.GetUint16At(this.m_position);
            if (ret > 0x7fff) ret -= 0x10000;
            this.m_position += 2;
            return ret;
        }

        public body_Read_Q(): number {
            this.Align(2);

            var ret: number = this.GetUint16At(this.m_position);
            this.m_position += 2;
            return ret;
        }

        public body_Read_I(): number {
            this.Align(4);

            var ret: number = this.GetUintAt(this.m_position);
            if (ret > 0x7fffffff) ret -= 0x100000000;
            this.m_position += 4;
            return ret;
        }

        public body_Read_U(): number {
            this.Align(4);

            var ret: number = this.GetUintAt(this.m_position);
            this.m_position += 4;
            return ret;
        }

        public body_Read_S(): string {
            var arr: Int8Array = this.body_Read_AY();

            // XXX - strings are null terminated, so increment position
            this.m_position++;

            return String.fromCharCode.apply(null, arr);
        }

        public body_Read_G(): string {
            var length: number = this.body_Read_Y();

            if (this.m_position + length <= this.m_Data.length) {
                var buffer: Int8Array = new Int8Array(length);

                for (var i: number = 0; i < length; i++) { buffer[i] = this.m_Data[this.m_position++]; }

                // XXX - strings are null terminated, so increment position
                this.m_position++;

                return String.fromCharCode.apply(null, buffer);

            }

            return "";
        }

        public body_ReadArrayLength(): number {
            return this.body_Read_I();
        }

        public body_Read_AY(): Uint8Array {
            var length: number = this.body_Read_I();
            var ret: Uint8Array = null;

            if (this.m_position + length <= this.m_Data.length) {
                ret = new Uint8Array(length);

                for (var i: number = 0; i < length; i++) { ret[i] = this.m_Data[this.m_position++]; }
            }

            return ret;
        }

        public body_Read_AN(): Int16Array {
            var length: number = this.body_Read_I();

            var ret = new Int16Array(length / 2);

            for (var i: number = 0; i < length / 2; i++) { ret[i] = this.body_Read_N(); }

            return ret;
        }

        public body_Read_AQ(): Uint16Array {
            var length: number = this.body_Read_I();

            var ret: Uint16Array = new Uint16Array(length / 2);

            for (var i: number = 0; i < length / 2; i++) { ret[i] = this.body_Read_Q(); }

            return ret;
        }

        public body_Read_AI(): Int32Array {
            var length: number = this.body_Read_I();

            var ret: Int32Array = new Int32Array(length / 4);

            for (var i: number = 0; i < length / 4; i++) { ret[i] = this.body_Read_I(); }

            return ret;
        }

        public body_Read_AU(): Uint32Array {
            var length: number = this.body_Read_I();

            var ret: Uint32Array = new Uint32Array(length / 4);

            for (var i: number = 0; i < length / 4; i++) { ret[i] = this.body_Read_U(); }

            return ret;
        }

        public body_ReadObject(sig: string): any {
            switch (sig) {
                case "s":
                case "o":
                    return this.body_Read_S();
                case "g": return this.body_Read_G();
                case "b": return this.body_Read_B();
                case "y": return this.body_Read_Y();
                case "n": return this.body_Read_N();
                case "q": return this.body_Read_Q();
                case "i": return this.body_Read_I();
                case "u": return this.body_Read_U();
                case "ay": return this.body_Read_AY();
                case "an": return this.body_Read_AN();
                case "aq": return this.body_Read_AQ();
                case "ai": return this.body_Read_AI();
                case "au": return this.body_Read_AU();
            }

            if (sig[0] == 'a') {
                var size: number = this.body_ReadArrayLength();
                var end: number = this.m_position + size;
                var ss: string = this.GetSubSignature(sig, 1);

                if (ss[0] == '{') {
                    var ret: Array<any> = new Array<any>();

                    while (this.m_position < end) {
                        var kv: Array<any> = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }
                else {
                    // XXX - now it's the same as in case of a{
                    var ret: Array<any> = new Array<any>();

                    while (this.m_position < end) {
                        var kv: Array<any> = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }

                return ret;
            }
            else if (sig[0] == '{') {
                this.Align(8);

                var subSignature: string = this.GetSubSignature(sig, 1);

                var k: any = this.body_ReadObject(subSignature);
                subSignature = this.GetSubSignature(sig, 1 + subSignature.length);
                var v: any = this.body_ReadObject(subSignature);

                var ret: Array<any> = new Array<any>(2);
                ret[0] = k;
                ret[1] = v;
                return ret;
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var ret: Array<any> = new Array<any>();

                var subSignature: string = "";
                var idx: number = 1;

                while (sig[idx + subSignature.length] != ')') {
                    idx += subSignature.length;
                    subSignature = this.GetSubSignature(sig, idx);

                    ret.push(this.body_ReadObject(subSignature));
                }

                return ret;
            }
            else if (sig == "v") {
                return this.body_Read_V();
            }
        }

        public body_Read_V(): any {
            var sig: string = this.body_Read_G();
            return this.body_ReadObject(sig);
        }

        public body_Read_AS(): Array<any> {
            var length: number = this.body_Read_I();
            var end: number = this.m_position + length;
            var ret: Array<any> = new Array<any>();
            while (this.m_position < end)
                ret.push(this.body_Read_S());
            return ret;
        };




        //    /* ------------------------------------------------------------------------------------------------------- */
        //    /*  OTHER THINGS                                                                                           */
        //    /* ------------------------------------------------------------------------------------------------------- */

        //    public MsgGeneric Reply
        //{
        //    get; set;
        //}

        /* ------------------------------------------------------------------------------------------------------- */
        /*  INTERNAL HEADER ACCESS IMPLEMENTATION                                                                  */
        /* ------------------------------------------------------------------------------------------------------- */

        private SetFlag(flag: number) {
            this.m_Data[2] |= flag;
        }

        private ClearFlag(flag: number) {
            this.m_Data[2] &= ~flag;
        }

        public SetFlags(f: number) {
            this.m_Data[2] = f;
        }

        private _ExtractFieldFromHeader(t: FieldType): any {
            var temp_position: number = this.m_position;
            var o = this._ExtractFieldFromHeaderX(t);
            this.m_position = temp_position;
            return o;
        }

        private _ExtractFieldFromHeaderX(t: FieldType): any {
            this.m_position = 16;

            while (this.m_position < 16 + this.RoundedHeaderLength()) {
                var field: FieldType = this.body_Read_Y();
                var signature: string = this.body_Read_G();

                switch (field) {
                    case FieldType.Path:
                        if (signature != "o") return null;
                        break;
                    case FieldType.Interface:
                    case FieldType.Member:
                    case FieldType.Destination:
                    case FieldType.Sender:
                    case FieldType.ErrorName:
                        if (signature != "s") return null;
                        break;
                    case FieldType.Signature:
                        if (signature != "g") return null;
                        break;
                    case FieldType.ReplySerial:
                        if (signature != "u") return null;
                        break;

                    default:
                        return null;
                }

                var str: any = null;

                if (FieldType.ReplySerial == field) {
                    str = this.body_Read_U();
                }
                else if (FieldType.Signature == field) {
                    str = this.body_Read_G();
                }
                else {
                    str = this.body_Read_S();
                }

                // if field is member then return string
                if (t == field)
                    return str;

                this.body_Write_R_Start();
            }

            return null;
        }


        private AddField(t: FieldType, v: any) {
            // can't add fields if body is already started (for simplicity)
            if (this.hdr_GetBodyLength() > 0)
                return;

            this.m_position = 16 + this.RoundedHeaderLength();

            this.EnsureBufferSize(128);

            switch (t) {
                case FieldType.Path: this.m_Data[this.m_position] = 0x01; break;
                case FieldType.Interface: this.m_Data[this.m_position] = 0x02; break;
                case FieldType.Member: this.m_Data[this.m_position] = 0x03; break;
                case FieldType.Destination: this.m_Data[this.m_position] = 0x06; break;
                case FieldType.Sender: this.m_Data[this.m_position] = 0x07; break;
                case FieldType.Signature: this.m_Data[this.m_position] = 0x08; break;
                case FieldType.ErrorName: this.m_Data[this.m_position] = 0x04; break;
                case FieldType.ReplySerial: this.m_Data[this.m_position] = 0x05; break;
            }

            this.m_position++;

            if (t == FieldType.Path) {
                this.body_Write_V(v, "o");
            }
            else if (t == FieldType.Signature) {
                this.body_Write_V(v, "g");
            }
            else if (t == FieldType.ReplySerial) {
                this.body_Write_V(v, "u");
            }
            else {
                this.body_Write_V(v, "s");
            }

            this.hdr_SetHeaderLength(this.m_position - 16);
        }

        private SetByteAt(idx: number, b: number) {
            this.m_Data[idx] = b;
        }

        private SetUintAt(idx: number, u: number) {
            this.m_Data[idx] = (u & 0xff);
            this.m_Data[idx + 1] = ((u >> 8) & 0xff);
            this.m_Data[idx + 2] = ((u >> 16) & 0xff);
            this.m_Data[idx + 3] = ((u >> 24) & 0xff);
        }

        private SetUint16At(idx: number, u: number) {
            this.m_Data[idx] = (u & 0x0ff);
            this.m_Data[idx + 1] = ((u & 0x0ff00) >> 8);
        }

        private SetStringAt(idx: number, s: string) {
            var length: number = s.length;

            for (var i: number = 0; i < length; i++) {
                this.m_Data[idx + i] = s.charCodeAt(i);
            }

            this.m_Data[idx + length] = 0;
        }

        private SetBytesAt(idx: number, data: Uint8Array) {
            this.m_Data.set(data, idx);
        }

        private GetByteAt(idx: number): number {
            if (idx + 1 <= this.m_Data.length) {
                return this.m_Data[idx];
            }
            else {
                return 0;
            }
        }

        private GetUintAt(idx: number): number {
            if (idx + 4 <= this.m_Data.length) {
                return this.m_Data[idx] +
                    (this.m_Data[idx + 1]) * 256 +
                    (this.m_Data[idx + 2]) * 256 * 256 +
                    (this.m_Data[idx + 3]) * 256 * 256 * 256;
            }
            else {
                return 0;
            }
        }

        private GetUint16At(idx: number): number {
            if (idx + 2 <= this.m_Data.length) {
                return this.m_Data[idx] + this.m_Data[idx + 1] * 256;
            }
            else {
                return 0;
            }
        }


        private RoundedHeaderLength(): number {
            return Math.floor((this.hdr_GetHeaderLength() + 7) / 8) * 8;
        }


        public GetBuffer(): Uint8Array {
            var length: number = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
            return this.m_Data.subarray(0, length);
        }

        public GetBodyBuffer(): Uint8Array {
            var idx = 16 + this.RoundedHeaderLength();
            var length: number = this.hdr_GetBodyLength();
            return this.m_Data.subarray(idx, length);
        }

        private m_position: number;
        private m_WritingBody: boolean = false;

        private Align(alignment: number) {
            this.m_position = Math.floor((this.m_position + alignment - 1) / alignment) * alignment;
        }

        private EnsureBufferSize(size: number) {
            size += this.m_position;

            if (size <= this.m_Data.length)
                return;

            var nb: Uint8Array = new Uint8Array(size);
            nb.set(this.m_Data);
            this.m_Data = nb;
        }

        /* ------------------------------------------------------------------------------------------------------- */
        /*  SIGNATURE HELPER                                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */

        public ValidateSignature(signature: string, single: boolean): boolean {
            if ((null == signature) || (0 == signature.length))
                return false;

            var count: number = 0;
            var idx: number = 0;


            while (idx < signature.length) {
                var ss: string = this.GetSubSignature(signature, idx);

                if (null == ss)
                    return false;

                idx += ss.length;
                count++;
            }

            if (single && (count > 1))
                return false;

            return true;
        }

        public GetSubSignature(signature: string, idx: number): string {
            var end: number = this.GetSubSignatureEnd(signature, idx);

            if (end > 0) {
                return signature.substring(idx, end);
            }
            else {
                return null;
            }
        }

        public GetSubSignatureEnd(signature: string, idx: number): number {
            // check if index is correct in first place
            if ((null == signature) || (idx >= signature.length) || (idx < 0))
                return -1;

            switch (signature[idx]) {
                case 'y':
                case 'n':
                case 'q':
                case 'i':
                case 'u':
                case 's':
                case 'o':
                case 'g':
                case 'x':
                case 't':
                case 'd':
                case 'b':
                case 'v':
                    return idx + 1;

                case '(':

                    idx++;

                    while (idx > 0) {
                        idx = this.GetSubSignatureEnd(signature, idx);

                        if (idx > 0) {
                            if (idx >= signature.length) {
                                idx = -1;
                                break;
                            }
                            else if (signature[idx] == ')') {
                                idx++;
                                break;
                            }
                        }
                    }

                    return idx;

                case 'a':
                    return this.GetSubSignatureEnd(signature, idx + 1);

                case '{':
                    idx = this.GetSubSignatureEnd(signature, idx + 1);

                    if (idx > 0) {
                        idx = this.GetSubSignatureEnd(signature, idx);

                        if (idx > 0) {
                            if ((idx >= signature.length) || (signature[idx] != '}')) {
                                idx = -1;
                            }
                            else {
                                idx++;
                            }
                        }
                    }

                    return idx;

                default:
                    return -1;
            }
        }

        private m_Data: Uint8Array = null;
        public m_Reply: MsgGeneric = null;
        public m_ReplyCb: any = null;
        private static m_NextSerialNumber: number = Math.floor(Math.random() * 32000);

    }

    enum ConnectorState {
        StateDisconnected,
        StateTransportConnecting,
        StateAuthAnonumousSent,
        StateInformProtoVersionSent,
        StateBeginSent,
        StateHelloSent,
        StateConnected
    };

    export enum ConnectorEventType {
        ConnectorEventNone,
        ConnectorEventConnected,
        ConnectorEventConnectionFailed,
        ConnectorEventProcessRequested,
        ConnectorEventTextReceived,
        ConnectorEventTextSent,
        ConnectorEventMsgReceived,
        ConnectorEventMsgSent,
        ConnectorEventMsgReplyReceived,
        ConnectorEventMsgReplySent
    };

    export abstract class ConnectorBase {

        protected abstract ConnectTransport();
        protected abstract DisconnectTransport();
        protected abstract WriteData(data: Uint8Array);
        protected abstract ReadData();

        public ConnectAndAuthenticate() {
            this.m_State = ConnectorState.StateTransportConnecting;

            this.ConnectTransport();
        }

        public Disconnect() {
            this.DisconnectTransport();
        }

        public GetLocalNodeId(): string {
            return this.m_LocalNodeId;
        }

        protected OnTransportConnected(ok: boolean) {
            if (ok) {
                this.m_State = ConnectorState.StateAuthAnonumousSent;
                this.SendLine("\0");
                this.SendLine("AUTH ANONYMOUS\r\n");

                this.ReadData();
            }
            else {
                this.m_State = ConnectorState.StateDisconnected;
                this.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnectionFailed, null);
            }
        }

        protected OnDataReceived(data: Uint8Array) {

            if (null != this.m_Buffer) {
                var a: Uint8Array = new Uint8Array(this.m_Buffer.length + data.length);
                var offset: number = this.m_Buffer.length;

                for (var i: number = 0; i < offset; i++)
                    a[i] = this.m_Buffer[i];

                for (var i: number = 0; i < data.length; i++)
                    a[i + offset] = data[i];

                this.m_Buffer = a;
            }
            else {
                this.m_Buffer = data;
            }

            this.Process();
        }

        Process() {
            // first distribute all outstanding event notifications
            //List < ConnectorEvent > l = m_QueuedEvents;
            //m_QueuedEvents = new List<ConnectorEvent>();

            //foreach(ConnectorEvent e in l)
            // {
            //    NotifyConnectorEvent(e.type, e.data);
            //}

            if (null == this.m_Buffer)
                return;

            if (ConnectorState.StateAuthAnonumousSent == this.m_State) {
                var line: string = this.ReceiveLine();

                if (line.substr(0, 3) == "OK ") {
                    this.SendLine("INFORM_PROTO_VERSION 12\r\n");
                    this.m_State = ConnectorState.StateInformProtoVersionSent;
                }
            }
            else if (ConnectorState.StateInformProtoVersionSent == this.m_State) {
                var line: string = this.ReceiveLine();

                if (line.substr(0, 21) == "INFORM_PROTO_VERSION ") {
                    this.SendLine("BEGIN 0d720fe995bc54ff15c00e9af0b20140\r\n");

                    this.m_Buffer = null;

                    this.m_State = ConnectorState.StateHelloSent;

                    this.SendHello();
                }
            }
            else {

                while (this.m_Buffer != null) {

                    // try to decode next message
                    var msg: AJ.MsgGeneric = new AJ.MsgGeneric(AJ.MsgType.Unknown);
                    var length = msg.FromBuffer(this.m_Buffer);
                    if (0 == length)
                        break;

                    this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgReceived, msg);

                    var t: MsgType = msg.hdr_GetMsgType();

                    if ((MsgType.Signal == t) || (MsgType.MethodCall == t)) {
                        var iface: string = msg.hdr_GetInterface();
                        if (iface == "org.freedesktop.DBus.Peer") org_freedesktop_dbus_peer._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Introspectable") org_freedesktop_dbus_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.allseen.Introspectable") org_allseen_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.About") org_alljoyn_about._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Icon") org_alljoyn_icon._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus") org_freedesktop_dbus._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus") org_alljoyn_bus._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Properties") org_freedesktop_dbus_properties._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Daemon") org_alljoyn_daemon._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Session") org_alljoyn_bus_peer_session._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Authentication") org_alljoyn_bus_peer_authentication._ProcessMsg(this, msg);
                        else Application._ProcessMsg(this, msg);

                        if (msg.m_Reply != null) this.SendMsg(msg.m_Reply);
                    }
                    else if (t == MsgType.MethodReturn) {
                        var i: number = 0;
                        var sent: MsgGeneric = null;

                        if (this.m_AssignedBusName == "") {
                            this.m_AssignedBusName = msg.hdr_GetSender();
                        }

                        while (i < this.m_CalledMethods.length) {
                            sent = this.m_CalledMethods[i];

                            if (sent.hdr_GetSerialNumber() == msg.hdr_GetReplySerial()) {
                                this.m_CalledMethods[i] = this.m_CalledMethods[this.m_CalledMethods.length - 1];
                                this.m_CalledMethods.pop();
                                break;
                            }
                        }

                        if ((null != sent) && (null != sent.m_ReplyCb)) {
                            sent.m_Reply = msg;
                            sent.m_ReplyCb();
                        }
                    }
                    else if (t == MsgType.Error) {
                        console.log("XXX - ERROR " + msg.hdr_GetErrorName());
                    }

                    // update buffer
                    if (length < this.m_Buffer.length) {
                        var old_buffer: Uint8Array = this.m_Buffer;
                        this.m_Buffer = new Uint8Array(old_buffer.length - length);

                        for (var i: number = 0; i < old_buffer.length - length; i++)
                            this.m_Buffer[i] = old_buffer[length + i];
                    }
                    else {
                        this.m_Buffer = null;
                    }
                }
            }
        }

        private SendHello() {
            var __this__ = this;
            org_freedesktop_dbus.method__Hello(this,
                function (connection: ConnectorBase, bus: string) {

                    __this__.m_LocalNodeId = bus;
                    __this__.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnected, null);

                    __this__.m_State = ConnectorState.StateConnected;

                    if (APP_NAME != "") {
                        __this__.BindSessionPort();
                    } else {
                        __this__.AttachSession();
                    }
                }
            );
        }

        private BindSessionPort() {
            var __this__ = this;
            org_alljoyn_bus.method__BindSessionPort(this, 2, 0,
                function (connection: ConnectorBase, disposition: any, portOut: number) {
                    org_alljoyn_about.signal__Announce(connection, 1, 2, null, null);
                }
            );
        }

        private AttachSession() {
        }

        private SendLine(buffer: string) {
            var a: Uint8Array = new Uint8Array(buffer.length);

            for (var i: number = 0; i < buffer.length; i++)
                a[i] = buffer.charCodeAt(i);

            this.WriteData(a);

            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextSent, buffer);
        }

        private ReceiveLine(): string {
            // XXX - this is not quite correct
            var line: string = String.fromCharCode.apply(null, this.m_Buffer);

            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextReceived, line);

            // XXX - this is not correct either
            this.m_Buffer = null;

            return line;
        }

        public SendMsg(msg: AJ.MsgGeneric) {
            var buffer: Uint8Array = msg.GetBuffer();
            this.WriteData(buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgSent, msg);
        }

        public SendMsgWithCallback(msg: AJ.MsgGeneric, cb) {
            msg.m_ReplyCb = cb;
            this.m_CalledMethods.push(msg);
            this.SendMsg(msg);
        }

        public SetConnectorEvent(e: (e: ConnectorEventType, d: any) => void) {
            this.m_EventHandler = e;
        }

        private QueueConnectorEvent(e: ConnectorEventType, d: any) {
            // XXX - no queue for timebeing
            this.NotifyConnectorEvent(e, d);
        }

        private NotifyConnectorEvent(e: ConnectorEventType, d: any) {
            if (null != this.m_EventHandler) {
                this.m_EventHandler(e, d);
            }
        }

        private m_State: ConnectorState;
        protected m_Buffer: Uint8Array = null;
        private m_LocalNodeId: string = "";
        private m_AssignedBusName: string = "";
        private m_PeerNodeId: string = "";
        private m_EventHandler: (e: ConnectorEventType, d: any) => void = null;
        private m_CalledMethods: Array<MsgGeneric> = new Array<MsgGeneric>();
    };

    //==============================================================================================================
    // org.alljoyn.About - producer
    //==============================================================================================================
    class org_alljoyn_about {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "GetAboutData") {
                return this.__process__GetAboutData(connection, msg);
            }
            else if (member == "GetObjectDescription") {
                return this.__process__GetObjectDescription(connection, msg);
            }
            else if (member == "Announce") {
                return this.__process__Announce(connection, msg);
            }

            return false;
        }

        private static __process__GetAboutData(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var ret: any = this.handle__GetAboutData(connection, s1);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static __process__GetObjectDescription(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: any = this.handle__GetObjectDescription(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(oas)");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static __process__Announce(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var q1: number = msg.body_Read_Q();
            var q2: number = msg.body_Read_Q();
            var o1: any = msg.body_ReadObject("a(oas)");
            var o2: any = msg.body_ReadObject("a{sv}");
            this.handle__Announce(connection, q1, q2, o1, o2);

            return true;
        }

        public static signal__Announce(connection, q1: number, q2: number, o1: any, o2: any): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetSessionless(true);
            msg.hdr_SetObjectPath("/About");
            msg.hdr_SetInterface("org.alljoyn.About");
            msg.hdr_SetMember("Announce");
            msg.hdr_SetSignature("qqa(oas)a{sv}");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(q1);
            msg.body_Write_Q(q2);


            // at this time we will write array elements manually
            //msg.body_WriteObject("a(oas)", [
            msg.body_Write_AROAS([
                ["/About", ["org.alljoyn.About"]],
                ["/About/DeviceIcon", ["org.alljoyn.Icon"]],
                ["/TestInterface", ["org.allmake.TestInterface"]]]);

            //msg.body_WriteArrayStart();

            //msg.body_WriteStructStart();
            //msg.body_WriteString("/About");
            //msg.body_WriteStringArray(new Array<string>("org.alljoyn.About"));

            //msg.body_WriteStructStart();
            //msg.body_WriteString("/About/DeviceIcon");
            //msg.body_WriteStringArray(new Array<string>("org.alljoyn.Icon"));

            //msg.body_WriteStructStart();
            //msg.body_WriteString("/TestInterface");
            //msg.body_WriteStringArray(new Array<string>("org.allmake.TestInterface"));

            //msg.body_WriteArray_End(true);

            // at this time we will write array elements manually
            //msg.body_WriteObject(o2, "a{sv}");
            msg.body_Write_A_Start();

            msg.body_Write_R_Start();
            msg.body_Write_S("AppId");
            msg.body_Write_V(APP_ID, "ay");

            msg.body_Write_R_Start();
            msg.body_Write_S("AppName");
            msg.body_Write_V(APP_NAME, "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("DeviceId");
            msg.body_Write_V(DEVICE_ID, "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("DeviceName");
            msg.body_Write_V(DEVICE_NAME, "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("Manufacturer");
            msg.body_Write_V(MANUFACTURER, "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("ModelNumber");
            msg.body_Write_V(MODEL_NUMBER, "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("SupportedLanguages");
            msg.body_Write_V(new Array<string>("en"), "as");

            msg.body_Write_R_Start();
            msg.body_Write_S("Description");
            msg.body_Write_V(APP_DESCRIPTION, "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("DefaultLanguage");
            msg.body_Write_V("en", "s");

            msg.body_Write_A_End(true);

            connection.SendMsg(msg);
        }

        private static handle__GetAboutData(connection, s1: string): any {
            return 0;
        }

        private static handle__GetObjectDescription(connection): any {
            return 0;
        }

        private static handle__Announce(connection, q1: number, q2: number, o1: any, o2: any): void {
        }
    }

    //==============================================================================================================
    // org.alljoyn.Icon - producer
    //==============================================================================================================

    class org_alljoyn_icon {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "GetUrl") {
                return this.__process__GetUrl(connection, msg);
            }
            else if (member == "GetContent") {
                return this.__process__GetContent(connection, msg);
            }

            return false;
        }

        public static __process__GetUrl(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: string = this.handle__GetUrl(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        public static __process__GetContent(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: Uint8Array = this.handle__GetContent(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);

            return true;
        }

        public static handle__GetUrl(connection): string {
            return "";
        }

        public static handle__GetContent(connection): Uint8Array {
            return DEVICE_ICON;
        }
    }

    //==============================================================================================================
    // org.freedesktop.DBus.Properties - producer
    //==============================================================================================================
    class org_freedesktop_dbus_properties {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "Get") {
                return this.__process__Get(connection, msg);
            }
            else if (member == "Set") {
                return this.__process__Set(connection, msg);
            }
            else if (member == "GetAll") {
                return this.__process__GetAll(connection, msg);
            }

            return false;
        }

        private static __process__Get(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var ret: any = this.handle__Get(connection, s1, s2);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();

            if (typeof (ret) == "string") {
                msg.m_Reply.body_Write_V(ret, "s");
            } else if (typeof (ret) == "number") {
                // XXX - why q??
                msg.m_Reply.body_Write_V(ret, "q");
            }
            return true;
        }

        private static __process__Set(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var v1: any = null; //msg.body_ReadVariant(); // XXX - fix this
            this.handle__Set(connection, s1, s2, v1);

            msg.CreateReply();
            msg.m_Reply.body_StartWriting();

            return true;
        }

        private static __process__GetAll(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var ret: any = this.handle__GetAll(connection, s1);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static handle__Get(connection, s1: string, s2: string): any {

            if (s1 == "org.alljoyn.Icon") {
                if (s2 == "Version") {
                    return DEVICE_ICON_VERSION;
                }
                else if (s2 == "MimeType") {
                    return DEVICE_ICON_MIME_TYPE;
                }
            }

            return 0;
        }

        private static handle__Set(connection, s1: string, s2: string, v1: any): void {
        }

        private static handle__GetAll(connection, s1: string): any {
            return 0;
        }
    }

    //==============================================================================================================
    // org.freedesktop.DBus.Introspectable - producer
    //==============================================================================================================

    class org_freedesktop_dbus_introspectable {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "Introspect") {
                return this.__process__Introspect(connection, msg);
            }

            return false;
        }

        private static __process__Introspect(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: string = this.handle__Introspect(connection, msg.hdr_GetObjectPath());

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        public static handle__Introspect(connection, op: string): string {
            var ret: string = "";
            if (op == "/About") {
                ret =
                    "<node name=\"/About\">" +
                    "<interface name=\"org.freedesktop.DBus.Properties\" >" +
                    "<method name=\"Get\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"Set\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"in\" />" +
                    "</method>" +
                    "<method name= \"GetAll\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "<interface name= \"org.alljoyn.About\" >" +
                    "<property name=\"Version\" type= \"q\" access= \"read\" />" +
                    "<method name=\"GetAboutData\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"GetObjectDescription\" >" +
                    "<arg type=\"a(oas)\" direction= \"out\" />" +
                    "</method>" +
                    "<signal name= \"Announce\" >" +
                    "<arg type=\"q\" />" +
                    "<arg type=\"q\" />" +
                    "<arg type=\"a(oas)\" />" +
                    "<arg type=\"a{sv}\" />" +
                    "</signal>" +
                    "</interface>" +
                    "</node>";
            }
            else if (op == "/About/DeviceIcon") {
                ret =
                    "<node name=\"/About/DeviceIcon\" >" +
                    "<interface name=\"org.freedesktop.DBus.Properties\" >" +
                    "<method name=\"Get\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"Set\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"in\" />" +
                    "</method>" +
                    "<method name= \"GetAll\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "<interface name= \"org.alljoyn.Icon\" >" +
                    "<property name=\"Version\" type= \"q\" access= \"read\" />" +
                    "<property name=\"MimeType\" type= \"s\" access= \"read\" />" +
                    "<property name=\"Size\" type= \"u\" access= \"read\" />" +
                    "<method name=\"GetUrl\" >" +
                    "<arg type=\"s\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"GetContent\" >" +
                    "<arg type=\"ay\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "</node>";
            }
            else {
                ret = APP_INTROSPECTION_XML;
            }

            return ret;
        }
    }

    //==============================================================================================================
    // org.allseen.Introspectable - producer
    //==============================================================================================================

    class org_allseen_introspectable {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member = msg.hdr_GetMember();

            if (member == "GetDescriptionLanguages") {
                return this.__process__GetDescriptionLanguages(connection, msg);
            }
            else if (member == "IntrospectWithDescription") {
                return this.__process__IntrospectWithDescription(connection, msg);
            }

            return false;
        }

        private static __process__GetDescriptionLanguages(connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetDescriptionLanguages(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("as");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AS(ret);

            return true;
        }

        private static __process__IntrospectWithDescription(connection, msg) {
            msg.body_StartReading();
            var languageTag = msg.body_ReadString();
            var ret = this.handle__IntrospectWithDescription(connection, msg.hdr_GetObjectPath(), languageTag);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static handle__GetDescriptionLanguages(connection) {
            return ["en"];
        }

        private static handle__IntrospectWithDescription(connection, op: string, languageTag) {
            // ignore language tag
            return org_freedesktop_dbus_introspectable.handle__Introspect(connection, op);
        }
    };

    //==============================================================================================================
    // org.freedesktop.DBus.Peer - producer
    //==============================================================================================================

    class org_freedesktop_dbus_peer {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "Ping") {
                return this.__process__Ping(connection, msg);
            }
            else if (member == "GetMachineId") {
                return this.__process__GetMachineId(connection, msg);
            }

            return false;
        }

        private static __process__Ping(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            this.handle__Ping(connection);

            msg.CreateReply();
            msg.m_Reply.body_StartWriting();

            return true;
        }

        private static __process__GetMachineId(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: string = this.handle__GetMachineId(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static handle__Ping(connection): void {
        }

        private static handle__GetMachineId(connection): string {
            return "default-string";
        }
    }

    //==============================================================================================================
    // org.freedesktop.DBus - consumer
    //==============================================================================================================

    class org_freedesktop_dbus {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "NameOwnerChanged") {
                return this.__process__NameOwnerChanged(connection, msg);
            }
            if (member == "NameLost") {
                return this.__process__NameLost(connection, msg);
            }
            if (member == "NameAcquired") {
                return this.__process__NameAcquired(connection, msg);
            }

            return false;
        }

        private static __process__NameOwnerChanged(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var s3: string = msg.body_Read_S();
            this.handle__NameOwnerChanged(connection, s1, s2, s3);

            return true;
        }

        private static __process__NameLost(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            this.handle__NameLost(connection, s1);

            return true;
        }

        private static __process__NameAcquired(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            this.handle__NameAcquired(connection, s1);

            return true;
        }

        public static method__RequestName(connection, s1: string, u1: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RequestName");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_U(u1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var u2: number = msg.body_Read_U();
                    if (null != cb) cb(connection, u2);
                }
            );
        };

        public static method__ReleaseName(connection, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("ReleaseName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var u1: number = msg.body_Read_U();
                    if (null != cb) cb(connection, u1);
                }
            );
        };

        public static method__Hello(connection, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("Hello");
            msg.SetFlags(6);
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var s1: string = msg.body_Read_S();
                    if (null != cb) cb(connection, s1);
                }
            );
        };

        public static method__NameHasOwner(connection, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameHasOwner");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var b1: boolean = msg.body_Read_B();
                    if (null != cb) cb(connection, b1);
                }
            );
        };

        public static method__AddMatch(connection, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("AddMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    if (null != cb) cb(connection);
                }
            );
        };

        public static method__RemoveMatch(connection, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RemoveMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    if (null != cb) cb(connection);
                }
            );
        };

        public static signal__NameOwnerChanged(connection, s1: string, s2: string, s3: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameOwnerChanged");
            msg.hdr_SetSignature("sss");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_S(s2);
            msg.body_Write_S(s3);
            connection.SendMsg(msg);
        };

        public static signal__NameLost(connection, s1: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameLost");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };

        public static signal__NameAcquired(connection, s1: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameAcquired");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };

        private static handle__NameOwnerChanged(connection, s1: string, s2: string, s3: string): void {
        };

        private static handle__NameLost(connection, s1: string): void {
        };

        private static handle__NameAcquired(connection, s1: string): void {
        };
    };

    //==============================================================================================================
    // org.alljoyn.Bus - consumer
    //==============================================================================================================
    class org_alljoyn_bus {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "FoundAdvertisedName") {
                return this.__process__FoundAdvertisedName(connection, msg);
            }
            else if (member == "LostAdvertisedName") {
                return this.__process__LostAdvertisedName(connection, msg);
            }
            else if (member == "MPSessionChanged") {
                return this.__process__MPSessionChanged(connection, msg);
            }
            else if (member == "MPSessionChangedWithReason") {
                return this.__process__MPSessionChangedWithReason(connection, msg);
            }
            else if (member == "SessionLost") {
                return this.__process__SessionLost(connection, msg);
            }
            else if (member == "SessionLostWithReason") {
                return this.__process__SessionLostWithReason(connection, msg);
            }
            else if (member == "SessionLostWithReasonAndDisposition") {
                return this.__process__SessionLostWithReasonAndDisposition(connection, msg);
            }

            return false;
        }

        private static __process__FoundAdvertisedName(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var name: string = msg.body_Read_S();
            var transport: number = msg.body_Read_Q();
            var prefix: string = msg.body_Read_S();
            this.handle__FoundAdvertisedName(connection, name, transport, prefix);

            return true;
        }

        private static __process__LostAdvertisedName(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var name: string = msg.body_Read_S();
            var transport: number = msg.body_Read_Q();
            var prefix: string = msg.body_Read_S();
            this.handle__LostAdvertisedName(connection, name, transport, prefix);

            return true;
        }

        private static __process__MPSessionChanged(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var name: string = msg.body_Read_S();
            var isAdded: boolean = msg.body_Read_B();
            this.handle__MPSessionChanged(connection, sessionId, name, isAdded);

            return true;
        }

        private static __process__MPSessionChangedWithReason(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var name: string = msg.body_Read_S();
            var isAdded: boolean = msg.body_Read_B();
            var reason: number = msg.body_Read_U();
            this.handle__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason);

            return true;
        }

        private static __process__SessionLost(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            this.handle__SessionLost(connection, sessionId);

            return true;
        }

        private static __process__SessionLostWithReason(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var reason: number = msg.body_Read_U();
            this.handle__SessionLostWithReason(connection, sessionId, reason);

            return true;
        }

        private static __process__SessionLostWithReasonAndDisposition(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var reason: number = msg.body_Read_U();
            var disposition: number = msg.body_Read_U();
            this.handle__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition);

            return true;
        }

        public static method__AdvertiseName(connection, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__AliasUnixUser(connection, aliasUID: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AliasUnixUser");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(aliasUID);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__BindSessionPort(connection, portIn: number, opts: any, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BindSessionPort");
            msg.hdr_SetSignature("qa{sv}");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(portIn);

            // XXX - just fixed options at the moment
            //msg.body_WriteObject(opts, "a{sv}");
            var ooo: Uint8Array = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x66, 0x00, 0x01, 0x79, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x6D, 0x75, 0x6C, 0x74, 0x69, 0x00, 0x01, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x70, 0x72, 0x6F, 0x78, 0x00, 0x01, 0x79, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x6E, 0x73, 0x00, 0x01, 0x71, 0x00, 0x00, 0x05, 0x01]);

            msg.body_Write_I(0x48);
            msg.body_WriteRaw(ooo);

            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var portOut: number = msg.body_Read_Q();
                    if (null != cb) cb(connection, disposition, portOut);
                }
            );
        };

        public static method__BusHello(connection, GUIDC: string, protoVerC: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BusHello");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(GUIDC);
            msg.body_Write_U(protoVerC);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var GUIDS: string = msg.body_Read_S();
                    var uniqueName: string = msg.body_Read_S();
                    var protoVerS: number = msg.body_Read_U();
                    if (null != cb) cb(connection, GUIDS, uniqueName, protoVerS);
                }
            );
        };

        public static method__CancelAdvertiseName(connection, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelAdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelFindAdvertisedName(connection, name: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelFindAdvertisedNameByTransport(connection, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelFindAdvertisementByTransport(connection, matching: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelSessionlessMessage(connection, serialNum: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelSessionlessMessage");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(serialNum);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__FindAdvertisedName(connection, name: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__FindAdvertisedNameByTransport(connection, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__FindAdvertisementByTransport(connection, matching: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static signal__FoundAdvertisedName(connection, name: string, transport: number, prefix: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FoundAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };

        public static method__GetHostInfo(connection, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("GetHostInfo");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var localipaddr: string = msg.body_Read_S();
                    var remoteipaddr: string = msg.body_Read_S();
                    if (null != cb) cb(connection, disposition, localipaddr, remoteipaddr);
                }
            );
        };

        public static method__JoinSession(connection, sessionHost: string, port: number, opts: any, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("JoinSession");
            msg.hdr_SetSignature("sqa{sv}");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(sessionHost);
            msg.body_Write_Q(port);
            msg.body_WriteObject("a{sv}", opts);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disp: number = msg.body_Read_U();
                    var sessionId: number = msg.body_Read_U();
                    var opts: any = msg.body_ReadObject("a{sv}");
                    if (null != cb) cb(connection, disp, sessionId, opts);
                }
            );
        };

        public static method__LeaveHostedSession(connection, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveHostedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__LeaveJoinedSession(connection, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveJoinedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__LeaveSession(connection, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static signal__LostAdvertisedName(connection, name: string, transport: number, prefix: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LostAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };

        public static signal__MPSessionChanged(connection, sessionId: number, name: string, isAdded: boolean): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChanged");
            msg.hdr_SetSignature("usb");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            connection.SendMsg(msg);
        };

        public static signal__MPSessionChangedWithReason(connection, sessionId: number, name: string, isAdded: boolean, reason: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChangedWithReason");
            msg.hdr_SetSignature("usbu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };

        public static method__OnAppResume(connection, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppResume");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__OnAppSuspend(connection, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppSuspend");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__Ping(connection, name: string, timeout: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("Ping");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_U(timeout);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__ReloadConfig(connection, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("ReloadConfig");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var loaded: boolean = msg.body_Read_B();
                    if (null != cb) cb(connection, loaded);
                }
            );
        };

        public static method__RemoveSessionMember(connection, sessionId: number, name: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("RemoveSessionMember");
            msg.hdr_SetSignature("us");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static signal__SessionLost(connection, sessionId: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLost");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsg(msg);
        };

        public static signal__SessionLostWithReason(connection, sessionId: number, reason: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReason");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };

        public static signal__SessionLostWithReasonAndDisposition(connection, sessionId: number, reason: number, disposition: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReasonAndDisposition");
            msg.hdr_SetSignature("uuu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            msg.body_Write_U(disposition);
            connection.SendMsg(msg);
        };

        public static method__SetIdleTimeouts(connection, reqLinkTO: number, reqProbeTO: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetIdleTimeouts");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(reqLinkTO);
            msg.body_Write_U(reqProbeTO);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var actLinkTO: number = msg.body_Read_U();
                    var actProbeTO: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition, actLinkTO, actProbeTO);
                }
            );
        };

        public static method__SetLinkTimeout(connection, sessionId: number, inLinkTO: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetLinkTimeout");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(inLinkTO);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var outLinkTO: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition, outLinkTO);
                }
            );
        };

        public static method__UnbindSessionPort(connection, port: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("UnbindSessionPort");
            msg.hdr_SetSignature("q");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(port);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        private static handle__FoundAdvertisedName(connection, name: string, transport: number, prefix: string): void {
        };

        private static handle__LostAdvertisedName(connection, name: string, transport: number, prefix: string): void {
        };

        private static handle__MPSessionChanged(connection, sessionId: number, name: string, isAdded: boolean): void {
        };

        private static handle__MPSessionChangedWithReason(connection, sessionId: number, name: string, isAdded: boolean, reason: number): void {
        };

        private static handle__SessionLost(connection, sessionId: number): void {
        };

        private static handle__SessionLostWithReason(connection, sessionId: number, reason: number): void {
        };

        private static handle__SessionLostWithReasonAndDisposition(connection, sessionId: number, reason: number, disposition: number): void {
        };
    };

    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Session - producer
    //==============================================================================================================

    class org_alljoyn_bus_peer_session {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "AcceptSession") {
                return this.__process__AcceptSession(connection, msg);
            }
            else if (member == "SessionJoined") {
                return this.__process__SessionJoined(connection, msg);
            }

            return false;
        }

        private static __process__AcceptSession(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var port: number = msg.body_Read_Q();
            var id: number = msg.body_Read_U();
            var src: string = msg.body_Read_S();
            var opts: any = msg.body_ReadObject("a{sv}");
            var ret: boolean = this.handle__AcceptSession(connection, port, id, src, opts);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("b");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_B(ret);

            return true;
        }

        private static __process__SessionJoined(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var port: number = msg.body_Read_Q();
            var id: number = msg.body_Read_U();
            var src: string = msg.body_Read_S();
            this.handle__SessionJoined(connection, port, id, src);

            return true;
        }

        private static handle__AcceptSession(connection, port: number, id: number, src: string, opts: any): boolean {
            return true;
        }

        private static handle__SessionJoined(connection, port: number, id: number, src: string): void {
        }
    };

    //==============================================================================================================
    // org.alljoyn.Daemon - producer
    //==============================================================================================================

    class org_alljoyn_daemon {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "ProbeAck") {
                return this.__process__ProbeAck(connection, msg);
            }
            else if (member == "ProbeReq") {
                return this.__process__ProbeReq(connection, msg);
            }

            return false;
        }

        private static __process__ProbeAck(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            this.handle__ProbeAck(connection);

            return true;
        }

        private static __process__ProbeReq(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            this.handle__ProbeReq(connection);

            return true;
        }

        public static signal__ProbeAck(connection): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeAck");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        }

        public static signal__ProbeReq(connection): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeReq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        }

        private static handle__ProbeAck(connection): void {
        }

        private static handle__ProbeReq(connection): void {
        }
    }

    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Authentication - producer
    //==============================================================================================================
    class org_alljoyn_bus_peer_authentication {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "AuthChallenge") {
                return this.__process__AuthChallenge(connection, msg);
            }
            else if (member == "ExchangeGroupKeys") {
                return this.__process__ExchangeGroupKeys(connection, msg);
            }
            else if (member == "ExchangeGuids") {
                return this.__process__ExchangeGuids(connection, msg);
            }
            else if (member == "ExchangeSuites") {
                return this.__process__ExchangeSuites(connection, msg);
            }
            else if (member == "GenSessionKey") {
                return this.__process__GenSessionKey(connection, msg);
            }
            else if (member == "KeyAuthentication") {
                return this.__process__KeyAuthentication(connection, msg);
            }
            else if (member == "KeyExchange") {
                return this.__process__KeyExchange(connection, msg);
            }
            else if (member == "SendManifest") {
                return this.__process__SendManifest(connection, msg);
            }
            else if (member == "SendMemberships") {
                return this.__process__SendMemberships(connection, msg);
            }

            return false;
        }

        private static __process__AuthChallenge(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var challenge: string = msg.body_Read_S();
            var ret: string = this.handle__AuthChallenge(connection, challenge);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__ExchangeGroupKeys(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localKeyMatter: Uint8Array = msg.body_Read_AY();
            var ret: Uint8Array = this.handle__ExchangeGroupKeys(connection, localKeyMatter);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);

            return true;
        }

        private static __process__ExchangeGuids(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localGuid: string = msg.body_Read_S();
            var localVersion: number = msg.body_Read_U();
            var ret: string = this.handle__ExchangeGuids(connection, localGuid, localVersion);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__ExchangeSuites(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localAuthList: Uint32Array = msg.body_Read_AU();
            var ret: Uint32Array = this.handle__ExchangeSuites(connection, localAuthList);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("au");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AU(ret);

            return true;
        }

        private static __process__GenSessionKey(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localGuid: string = msg.body_Read_S();
            var remoteGuid: string = msg.body_Read_S();
            var localNonce: string = msg.body_Read_S();
            var ret: string = this.handle__GenSessionKey(connection, localGuid, remoteGuid, localNonce);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__KeyAuthentication(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localVerifier: any = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret: any = this.handle__KeyAuthentication(connection, localVerifier);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteVariant(ret); // XXX - fix this

            return true;
        }

        private static __process__KeyExchange(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localAuthMask: number = msg.body_Read_U();
            var localPublicKey: any = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret: number = this.handle__KeyExchange(connection, localAuthMask, localPublicKey);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("u");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_U(ret);

            return true;
        }

        private static __process__SendManifest(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var manifest: any = msg.body_ReadObject("a(ssa(syy))");
            var ret: any = this.handle__SendManifest(connection, manifest);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(ssa(syy))");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static __process__SendMemberships(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sendCode: number = msg.body_Read_Y();
            var memberships: any = msg.body_ReadObject("a(yay)");
            var ret: number = this.handle__SendMemberships(connection, sendCode, memberships);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("y");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_Y(ret);

            return true;
        }

        private static handle__AuthChallenge(connection, challenge: string): string {
            return "default-string";
        }

        private static handle__ExchangeGroupKeys(connection, localKeyMatter: Uint8Array): Uint8Array {
            return null; //[1, 2, 3];
        }

        private static handle__ExchangeGuids(connection, localGuid: string, localVersion: number): string {
            return "default-string";
        }

        private static handle__ExchangeSuites(connection, localAuthList: Uint32Array): Uint32Array {
            return null; //[1, 2, 3];
        }

        private static handle__GenSessionKey(connection, localGuid: string, remoteGuid: string, localNonce: string): string {
            return "default-string";
        }

        private static handle__KeyAuthentication(connection, localVerifier: any): any {
            return 0;
        }

        private static handle__KeyExchange(connection, localAuthMask: number, localPublicKey: any): number {
            return 0;
        }

        private static handle__SendManifest(connection, manifest: any): any {
            return 0;
        }

        private static handle__SendMemberships(connection, sendCode: number, memberships: any): number {
            return 0;
        }
    }

    //==============================================================================================================
    // WEB SOCKET SPECIFIC CODE BELOW
    //==============================================================================================================

    export class ConnectorWebSocket extends ConnectorBase {

        m_socket: any;
        m_ConnectionId: number;

        protected ConnectTransport() {
            var _this_ = this;
            this.m_socket = new WebSocket("ws://localhost:8088", "binary");
            this.m_socket.binaryType = "arraybuffer";

            this.m_socket.onopen = function (event: any) {
                _this_.OnTransportConnected(true);
            }

            this.m_socket.onmessage = function (e: any) {
                _this_.OnDataReceived(new Uint8Array(e.data));
            }

            this.m_socket.onerror = function (e: any) {
                _this_.OnTransportConnected(false);
            }
        }

        protected DisconnectTransport() {
            if (this.m_socket != null) {
                (this.m_socket as WebSocket).close();
                this.m_socket = null;
            }
        }

        protected WriteData(data: Uint8Array) {
            this.m_socket.send(data);
        }

        private OnSendSuccess() {
            console.log("SEND SUCCESS");
        }

        private OnSendFailed() {
            console.log("SEND FAILED");
        }

        protected ReadData() {
            // nothing to do in this implementation
        }
    }


    //==============================================================================================================
    // GENERATED CODE BELOW
    //==============================================================================================================

    
    var APP_ID: Uint8Array = new Uint8Array([
        0x12, 0x34]);
    var APP_NAME: string = "Test";
    var APP_DESCRIPTION: string = "Application Description";
    var DEVICE_ID: string = "7019565b8f9a75d05f771fa1baad431c";
    var DEVICE_NAME: string = "TestDevice.1234";
    var MANUFACTURER: string = "Microsoft";
    var MODEL_NUMBER: string = "X1";

    var APP_INTROSPECTION_XML: string =
        "<node name = \"/TestInterface\">" +
        "<interface name=\"org.allmake.TestInterface\">" +
        "<method name=\"TestMethod\">" +
        "<arg type=\"s\" direction=\"in\"/>" +
        "<arg type=\"s\" direction=\"out\"/>" +
        "</method>" +
        "<signal name=\"FirstSignal\">" +
        "<arg type=\"s\" />" +
        "<arg type=\"s\" />" +
        "</signal>" +
        "<signal name=\"SecondSignal\">" +
        "<arg type=\"s\" />" +
        "<arg type=\"s\" />" +
        "<arg type=\"s\" />" +
        "</signal>" +
        "</interface>" +
        "</node>" + "";

    var DEVICE_ICON_VERSION: number = 1;
    var DEVICE_ICON_MIME_TYPE: string = "image/png";
    var DEVICE_ICON_URL: string = "";
    var DEVICE_ICON: Uint8Array = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40, 0x08, 0x06, 0x00, 0x00, 0x00, 0xAA, 0x69, 0x71,
        0xDE, 0x00, 0x00, 0x00, 0x01, 0x73, 0x52, 0x47, 0x42, 0x00, 0xAE, 0xCE, 0x1C, 0xE9, 0x00, 0x00,
        0x00, 0x04, 0x67, 0x41, 0x4D, 0x41, 0x00, 0x00, 0xB1, 0x8F, 0x0B, 0xFC, 0x61, 0x05, 0x00, 0x00,
        0x00, 0x09, 0x70, 0x48, 0x59, 0x73, 0x00, 0x00, 0x21, 0x38, 0x00, 0x00, 0x21, 0x38, 0x01, 0x45,
        0x96, 0x31, 0x60, 0x00, 0x00, 0x07, 0x5B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x5E, 0xED, 0x9A, 0x0B,
        0x4C, 0x53, 0x57, 0x18, 0xC7, 0xFF, 0xA5, 0xD0, 0x17, 0x45, 0x41, 0x91, 0x97, 0x45, 0x90, 0x30,
        0x13, 0xDF, 0x99, 0x38, 0x41, 0xF0, 0x11, 0xE7, 0x4C, 0x74, 0x5B, 0xB2, 0x47, 0x82, 0xD9, 0x12,
        0xB3, 0xA9, 0x63, 0xBA, 0x38, 0xE7, 0xE6, 0x62, 0x66, 0x62, 0x66, 0x50, 0xE3, 0x92, 0x3D, 0xE2,
        0x7C, 0xCC, 0xC4, 0x4D, 0x05, 0x67, 0x8C, 0xCB, 0xE6, 0x63, 0x3E, 0xA6, 0x1B, 0xDB, 0xDC, 0xE6,
        0xA6, 0x82, 0xBA, 0x08, 0x09, 0x42, 0x4C, 0x24, 0x80, 0x08, 0x8A, 0x08, 0x94, 0x77, 0x29, 0x85,
        0xB6, 0xFB, 0x3E, 0x7B, 0x1B, 0x90, 0xB6, 0xF4, 0x16, 0x4A, 0x6F, 0x19, 0xFE, 0x92, 0x9B, 0xF6,
        0x9C, 0x9B, 0x3E, 0xBE, 0xFF, 0x3D, 0xE7, 0x7B, 0x9C, 0x73, 0x64, 0xD8, 0x74, 0xC3, 0x8A, 0x61,
        0x4C, 0x80, 0xF0, 0x3A, 0x6C, 0x79, 0x22, 0x80, 0xF0, 0x3A, 0x6C, 0x79, 0x22, 0x80, 0xF0, 0x3A,
        0x6C, 0x71, 0x11, 0x05, 0x2C, 0x40, 0x8D, 0x51, 0x78, 0xEF, 0x63, 0xF8, 0xDF, 0xA8, 0x03, 0x81,
        0x91, 0x0A, 0x5B, 0x7B, 0x90, 0x71, 0x2E, 0x40, 0x8D, 0x01, 0xD6, 0x83, 0x73, 0x84, 0x86, 0xEF,
        0xF9, 0xAB, 0xAC, 0x05, 0xCF, 0xEE, 0x2C, 0x06, 0x46, 0x0C, 0xBE, 0x08, 0xCE, 0xA7, 0x80, 0x4C,
        0xDA, 0xD4, 0xA0, 0xBA, 0xB9, 0x93, 0x1F, 0x8D, 0x4F, 0x70, 0xE1, 0x03, 0x7C, 0xF4, 0xEB, 0xAE,
        0xF0, 0xE1, 0xCF, 0xBB, 0x10, 0x40, 0xDA, 0x11, 0x20, 0x97, 0xF9, 0x4E, 0x01, 0xE7, 0x3E, 0x40,
        0x6F, 0x84, 0x75, 0x5F, 0x2A, 0xAA, 0x5B, 0x3B, 0x45, 0x3F, 0x8C, 0xF6, 0x4E, 0x0B, 0xC6, 0x87,
        0x29, 0x85, 0x56, 0x37, 0x0D, 0x1D, 0x66, 0x18, 0x4C, 0x66, 0xD1, 0x46, 0xA9, 0x83, 0x02, 0x70,
        0xA2, 0x50, 0x8F, 0x8C, 0xA3, 0x65, 0x40, 0x70, 0x90, 0xD0, 0x3B, 0x78, 0xB8, 0x88, 0x02, 0xD4,
        0x55, 0xDB, 0x21, 0xBC, 0x17, 0x01, 0xDB, 0x76, 0x9F, 0x1C, 0xE7, 0x4F, 0xCF, 0xD9, 0xDA, 0x3D,
        0xD8, 0xF0, 0x7D, 0x39, 0x76, 0xFC, 0x5C, 0x05, 0xA8, 0xE4, 0x42, 0x8F, 0x08, 0x94, 0x34, 0x30,
        0x7D, 0xE0, 0x00, 0x19, 0xD7, 0x3E, 0x60, 0x8C, 0xCA, 0xB3, 0x2B, 0x82, 0x2E, 0x27, 0x84, 0x04,
        0x53, 0x48, 0xE3, 0x7B, 0xCE, 0x3E, 0xE3, 0xEA, 0xF2, 0x91, 0xF1, 0x8C, 0x0B, 0x01, 0x3C, 0x84,
        0xC7, 0x90, 0x2B, 0xB7, 0xD1, 0xD7, 0x3D, 0x3F, 0xC0, 0x3B, 0x02, 0x0C, 0x36, 0x16, 0x52, 0x90,
        0x7C, 0x0C, 0xC8, 0x9F, 0xA0, 0xBD, 0x0B, 0x30, 0xD0, 0xC5, 0xAF, 0xED, 0xD4, 0xE6, 0x3E, 0xBE,
        0x67, 0xEE, 0x9F, 0xCA, 0xDE, 0x5B, 0x0F, 0xA8, 0x26, 0x1F, 0x90, 0xED, 0x98, 0x3C, 0x6D, 0x3D,
        0x5B, 0x89, 0x2D, 0x7F, 0x3F, 0xF0, 0xCC, 0x07, 0x30, 0x5D, 0x64, 0x94, 0x91, 0x8C, 0x6C, 0x32,
        0x41, 0x11, 0xA3, 0xC5, 0xC2, 0x38, 0x0D, 0x9E, 0x8E, 0xD4, 0x40, 0xA1, 0x90, 0xC1, 0x1A, 0x44,
        0xDF, 0x65, 0xB6, 0x40, 0xD6, 0x65, 0x85, 0x91, 0x5E, 0x8B, 0xC9, 0x5F, 0x15, 0x3D, 0x6C, 0x47,
        0x79, 0x49, 0x93, 0x2D, 0x8B, 0x0C, 0xA6, 0x29, 0xA4, 0x10, 0xF7, 0x6C, 0xFD, 0x4F, 0x00, 0x36,
        0x9C, 0x1C, 0x6A, 0xEA, 0x33, 0xA3, 0xB1, 0x3A, 0x35, 0x12, 0x6F, 0xCC, 0x0C, 0x17, 0x6E, 0x88,
        0xE3, 0x7A, 0x55, 0x1B, 0xBE, 0xB9, 0x58, 0x8D, 0xEC, 0x82, 0x06, 0x51, 0xBF, 0xE9, 0x5F, 0x53,
        0xA0, 0xD6, 0x80, 0xB4, 0x28, 0x0D, 0x3A, 0x8F, 0xCC, 0xC3, 0x95, 0x75, 0x93, 0x3D, 0x36, 0x9E,
        0x99, 0xA5, 0x0B, 0x46, 0xD6, 0xB2, 0x44, 0xF2, 0x3B, 0x24, 0xA4, 0xD5, 0xFD, 0xB3, 0xF5, 0x1F,
        0x01, 0xE8, 0xC9, 0x5D, 0xFD, 0x68, 0x0A, 0x2E, 0xAF, 0x9F, 0x04, 0x1A, 0xC4, 0x03, 0x87, 0xFD,
        0x86, 0x08, 0xFC, 0x43, 0x00, 0x32, 0xFE, 0xCE, 0xEE, 0x64, 0x24, 0x27, 0x86, 0x0A, 0x1D, 0xCE,
        0xC9, 0xBF, 0xD7, 0x86, 0x73, 0xB7, 0x1A, 0x71, 0xAA, 0xB8, 0x01, 0x17, 0xA9, 0x60, 0x2A, 0xAB,
        0xEF, 0x2B, 0x57, 0x11, 0x97, 0x78, 0x49, 0xEF, 0x03, 0xF4, 0x1D, 0x38, 0x96, 0x91, 0x88, 0xF4,
        0xA4, 0x31, 0x42, 0xC7, 0xE3, 0x64, 0x1C, 0x2D, 0x45, 0xD6, 0xB5, 0x5A, 0xA0, 0x85, 0x0A, 0x24,
        0x15, 0x8D, 0x0D, 0xB9, 0x60, 0x18, 0x0F, 0x6F, 0x72, 0x82, 0xEC, 0x28, 0xE5, 0x31, 0xC1, 0x58,
        0x35, 0x2D, 0x0C, 0x9B, 0x5E, 0xD0, 0x41, 0x27, 0xE4, 0x10, 0xB2, 0x0F, 0xAE, 0x02, 0x1A, 0xCA,
        0x24, 0xDD, 0x64, 0xA0, 0xD2, 0x8E, 0x00, 0x0A, 0x5D, 0xBA, 0x68, 0xB5, 0x53, 0xE3, 0xCF, 0xE4,
        0xD7, 0x41, 0xB6, 0xEC, 0x1F, 0x64, 0x15, 0xE8, 0x01, 0x2D, 0x19, 0x42, 0x46, 0x62, 0x14, 0xA5,
        0xDA, 0xBC, 0x4E, 0xC0, 0x57, 0x28, 0xBD, 0x0F, 0xA7, 0xA4, 0x49, 0xA7, 0x05, 0x05, 0x42, 0xEC,
        0xBB, 0x51, 0x87, 0xD8, 0xF7, 0xAF, 0x21, 0x61, 0x7B, 0xA1, 0xED, 0x0B, 0x14, 0xE2, 0x26, 0x92,
        0xB4, 0x02, 0x50, 0x88, 0x3B, 0xBE, 0x9C, 0x1C, 0x56, 0x2F, 0x4E, 0xE7, 0xD7, 0xE3, 0xE5, 0xDD,
        0xB7, 0x80, 0x78, 0x2D, 0xA5, 0xC5, 0x34, 0x72, 0xDC, 0xD5, 0x11, 0x01, 0x74, 0x5F, 0x49, 0x06,
        0x93, 0x48, 0xE5, 0x5C, 0xBF, 0xAC, 0xBE, 0x02, 0x99, 0xC8, 0x30, 0x28, 0x9D, 0x00, 0x3C, 0xF1,
        0x68, 0x18, 0xA7, 0x8C, 0x23, 0x23, 0x7B, 0xF1, 0xCA, 0xCE, 0x22, 0x20, 0x96, 0x9E, 0x78, 0x7F,
        0x26, 0x27, 0x4F, 0x91, 0x70, 0x35, 0x05, 0x01, 0xFA, 0xB0, 0x88, 0x02, 0x4C, 0x3A, 0x01, 0xCC,
        0x66, 0xA4, 0x4C, 0x72, 0x74, 0x7A, 0x5F, 0xE5, 0x3E, 0x04, 0xC2, 0x68, 0x68, 0xF7, 0xC7, 0xF8,
        0x9E, 0x88, 0xAC, 0x3E, 0x25, 0x14, 0x00, 0x48, 0x8A, 0x22, 0x43, 0x7B, 0x51, 0x4B, 0xA5, 0x38,
        0xA8, 0x24, 0xF6, 0x15, 0xD2, 0x09, 0x40, 0xA8, 0x02, 0x1D, 0x23, 0x83, 0x85, 0xFB, 0x28, 0x87,
        0xF1, 0x15, 0xD2, 0x09, 0x40, 0x8E, 0xAB, 0xB8, 0xDE, 0x20, 0x34, 0xBA, 0x49, 0x9F, 0x1E, 0x06,
        0xB4, 0x7A, 0xB0, 0x16, 0x31, 0x40, 0xA4, 0x13, 0x20, 0x50, 0x86, 0x9C, 0xA2, 0x66, 0xA1, 0xD1,
        0xCD, 0xF4, 0x68, 0x0D, 0x42, 0x79, 0x4D, 0xA0, 0x9F, 0xD5, 0x9D, 0xA7, 0x48, 0x27, 0x00, 0x3B,
        0xA9, 0xB6, 0x2E, 0xD4, 0xB4, 0x52, 0xC5, 0xD7, 0x8B, 0x07, 0xDB, 0x93, 0x80, 0x87, 0x6D, 0x3E,
        0x11, 0x41, 0x52, 0x1F, 0xC0, 0x89, 0xCD, 0xF2, 0x23, 0x25, 0x42, 0xA3, 0x1B, 0x25, 0x4D, 0x0F,
        0xE3, 0x81, 0xB9, 0x08, 0x34, 0x98, 0x6C, 0x75, 0xFF, 0x20, 0x22, 0xAD, 0x00, 0xE4, 0xED, 0x73,
        0xFE, 0xAD, 0xC7, 0xCD, 0xEA, 0x76, 0xA1, 0xA3, 0x1B, 0x25, 0xC5, 0xF3, 0xCE, 0x3D, 0xB3, 0xF1,
        0xEA, 0x74, 0x0A, 0x95, 0x77, 0x5B, 0x29, 0xED, 0xE5, 0x7C, 0xCF, 0xFB, 0x48, 0x2B, 0x00, 0x43,
        0x73, 0x7E, 0xDA, 0xE6, 0x7C, 0x4A, 0xEB, 0x9D, 0x0F, 0xF7, 0x93, 0x6F, 0x4E, 0x40, 0xFB, 0xA1,
        0xB9, 0x58, 0x18, 0x4B, 0x09, 0x53, 0x25, 0x4D, 0x0B, 0x5E, 0xFD, 0xF1, 0x22, 0xD2, 0x0B, 0xC0,
        0x90, 0xD3, 0x0B, 0x5A, 0x9D, 0x8B, 0x7A, 0x17, 0xC3, 0x5D, 0x45, 0x0E, 0xF3, 0xC2, 0xDA, 0x89,
        0x68, 0xCE, 0x4A, 0xC5, 0xA2, 0x71, 0x6A, 0x12, 0x82, 0x47, 0x84, 0x77, 0x84, 0xF0, 0x0F, 0x01,
        0xF8, 0x5F, 0x50, 0xFA, 0x1A, 0xBE, 0x26, 0x17, 0x67, 0x0B, 0xEA, 0x6C, 0x7D, 0x4E, 0x08, 0x09,
        0x92, 0xE3, 0xB7, 0xB5, 0x93, 0xD1, 0x74, 0x30, 0x0D, 0x29, 0x91, 0x14, 0x29, 0xA8, 0x02, 0x85,
        0x65, 0x60, 0x42, 0xF8, 0x87, 0x00, 0x5C, 0xBB, 0xF3, 0x7E, 0x64, 0x8C, 0x16, 0x2F, 0xED, 0x2F,
        0x41, 0xFC, 0xB6, 0x02, 0x34, 0xF1, 0x62, 0xA7, 0x0B, 0x46, 0x28, 0xE4, 0xC8, 0xFB, 0x70, 0x0A,
        0x6E, 0x7F, 0x31, 0x13, 0xA1, 0x72, 0x32, 0xA1, 0xB1, 0xFF, 0x3B, 0xD9, 0x7E, 0x22, 0x00, 0x23,
        0xE4, 0xEE, 0x14, 0x19, 0x2A, 0x0C, 0x16, 0x84, 0x52, 0x45, 0x97, 0xFE, 0xAD, 0x63, 0x84, 0xE8,
        0xC9, 0x53, 0xA3, 0x55, 0x68, 0xD8, 0x3E, 0x03, 0xC7, 0x56, 0x4E, 0x78, 0xB4, 0xA8, 0xD2, 0x9F,
        0xD1, 0xE0, 0x47, 0x02, 0xF4, 0x80, 0x2B, 0xBA, 0xB1, 0x5A, 0x9C, 0x28, 0x6A, 0x82, 0x6C, 0xC5,
        0x25, 0x64, 0x9E, 0xBF, 0x2B, 0xDC, 0x70, 0x4E, 0x7A, 0x52, 0x38, 0xDA, 0xB3, 0x53, 0xA1, 0xE5,
        0x51, 0x63, 0xF2, 0x2C, 0x5A, 0xF8, 0xA7, 0x00, 0x76, 0x78, 0x8B, 0x8C, 0x6A, 0xFC, 0x6D, 0x7F,
        0x3C, 0x80, 0xEC, 0xAD, 0xCB, 0xF8, 0xF8, 0x9C, 0x6B, 0x21, 0x54, 0x72, 0x39, 0x5A, 0xBE, 0x4C,
        0x46, 0xFC, 0x08, 0xFA, 0x0C, 0xEF, 0x17, 0x88, 0xC4, 0xBF, 0x05, 0xB0, 0xC3, 0x6B, 0xFD, 0x51,
        0x1A, 0x7C, 0xC2, 0x42, 0x64, 0x5C, 0xC1, 0xAE, 0x3F, 0xEF, 0x0B, 0x37, 0x1C, 0x29, 0xDF, 0x9C,
        0x84, 0xB8, 0x91, 0x54, 0x50, 0x89, 0x8C, 0x12, 0x43, 0x43, 0x00, 0x3B, 0x1A, 0x12, 0x22, 0x52,
        0x8D, 0xF5, 0x67, 0x2A, 0x21, 0x5B, 0x97, 0x87, 0xAA, 0x66, 0xCA, 0x14, 0x9D, 0x70, 0x27, 0x73,
        0x06, 0xD0, 0x4C, 0x05, 0x95, 0x88, 0x4C, 0x7A, 0x68, 0x09, 0x60, 0x87, 0xD7, 0x08, 0xB5, 0x4A,
        0xC4, 0xAE, 0xC9, 0xC3, 0x81, 0xCB, 0x35, 0x42, 0xE7, 0xE3, 0x9C, 0x7F, 0x77, 0x32, 0x28, 0x94,
        0x08, 0x2D, 0xD7, 0x0C, 0x4D, 0x01, 0x18, 0x0E, 0x1A, 0x71, 0x21, 0x58, 0x95, 0x5D, 0x82, 0x1F,
        0xAE, 0xD7, 0xDA, 0xFA, 0x7A, 0xF0, 0xFC, 0x14, 0x4A, 0xA1, 0x79, 0x0B, 0xCD, 0xCD, 0xFE, 0xC0,
        0xD0, 0x15, 0xC0, 0x4E, 0x8C, 0x06, 0xAF, 0xED, 0x2A, 0x86, 0xC9, 0xC9, 0x94, 0xDF, 0x38, 0x3F,
        0xC2, 0x6D, 0xEA, 0x3C, 0xF4, 0x05, 0xE0, 0x07, 0x4C, 0x21, 0x73, 0xE5, 0x61, 0xC7, 0x9C, 0x61,
        0xE6, 0x84, 0x11, 0xB6, 0xDD, 0xE3, 0x3E, 0x18, 0xFA, 0x02, 0x30, 0x64, 0xC5, 0x55, 0x27, 0x15,
        0x65, 0x7C, 0x28, 0xA5, 0xCB, 0x6E, 0xA2, 0xC1, 0xFF, 0x43, 0x00, 0xF2, 0x07, 0x26, 0x21, 0x91,
        0xEC, 0x49, 0x17, 0x6F, 0x90, 0xBA, 0x31, 0xD1, 0x0F, 0x04, 0x10, 0x11, 0xAB, 0xDC, 0x41, 0x5F,
        0x11, 0xE2, 0xB8, 0xBE, 0x6A, 0x5B, 0x6D, 0x72, 0xB3, 0x41, 0x24, 0xAD, 0x00, 0x2D, 0x14, 0xA6,
        0x3A, 0xC4, 0x25, 0x2C, 0x7D, 0x42, 0x1E, 0x70, 0xE9, 0xD4, 0x51, 0x42, 0xA3, 0x9B, 0xE2, 0x92,
        0x66, 0xDB, 0xCE, 0x52, 0x1F, 0x48, 0x27, 0x80, 0xD1, 0x8C, 0x23, 0xAF, 0x27, 0x62, 0xF9, 0xAC,
        0x70, 0xDB, 0x8A, 0x0F, 0x7B, 0x6B, 0x27, 0xC3, 0xD8, 0x2D, 0x3C, 0x80, 0xF4, 0x46, 0x64, 0x2E,
        0xD1, 0xD9, 0xDA, 0x3D, 0xF8, 0xBA, 0xB0, 0x81, 0x46, 0x80, 0xC4, 0x53, 0x20, 0xC8, 0xBE, 0x9B,
        0xEB, 0x84, 0xD2, 0x7A, 0x23, 0x0E, 0x2D, 0x1D, 0x0F, 0xFD, 0xFE, 0x34, 0x2C, 0x4E, 0x08, 0x06,
        0xCA, 0x5A, 0x6C, 0x6B, 0x80, 0x62, 0xD2, 0x58, 0x5E, 0x41, 0x22, 0x11, 0x71, 0xAF, 0x15, 0x95,
        0x7B, 0x52, 0x84, 0xCE, 0x6E, 0x0C, 0x9D, 0x66, 0x54, 0xF2, 0x91, 0x99, 0x3E, 0x7E, 0x9F, 0xF1,
        0x9E, 0x00, 0x2A, 0x39, 0x7E, 0x2F, 0x6D, 0xC1, 0xA9, 0xA2, 0x06, 0xFC, 0x28, 0x5C, 0x39, 0xB7,
        0x9B, 0x70, 0x4B, 0x4F, 0xC3, 0xDC, 0xCD, 0x9F, 0x08, 0x53, 0xCB, 0xF1, 0xCB, 0x3B, 0x13, 0x61,
        0xFD, 0x6E, 0x3E, 0x3E, 0x5F, 0x32, 0x16, 0x49, 0xD1, 0x6A, 0x5B, 0x79, 0x5B, 0x4F, 0x9E, 0xBD,
        0x89, 0xD2, 0x5D, 0x3E, 0x14, 0x65, 0xBF, 0x38, 0xFD, 0xAD, 0xA1, 0x7B, 0x8D, 0x26, 0xBC, 0x9D,
        0x1C, 0x0E, 0xEB, 0xE1, 0x79, 0xD0, 0x39, 0x39, 0x59, 0x3E, 0xF5, 0xB3, 0x9B, 0x54, 0x3F, 0x90,
        0xA8, 0x6E, 0xF0, 0xDE, 0xF9, 0x00, 0x86, 0xFF, 0x5C, 0xEF, 0x6F, 0x53, 0x91, 0xC6, 0xBC, 0x73,
        0xDB, 0x1B, 0x7A, 0x7A, 0x5B, 0x16, 0x44, 0x21, 0xF3, 0xC5, 0x58, 0xA1, 0xC3, 0x91, 0x72, 0x12,
        0x2F, 0x97, 0xA6, 0x47, 0x69, 0x83, 0x09, 0x66, 0x8A, 0xE7, 0x81, 0x41, 0x01, 0x48, 0x18, 0xAD,
        0xC4, 0x82, 0x84, 0x10, 0xC4, 0xF4, 0x71, 0x96, 0x70, 0xC3, 0xE9, 0x0A, 0xEC, 0xB8, 0x50, 0x2D,
        0xEA, 0xC8, 0xBD, 0x77, 0x05, 0xF0, 0x04, 0x12, 0xE0, 0xD3, 0x45, 0xD1, 0xD8, 0xB8, 0xD8, 0x71,
        0xEE, 0x0E, 0x84, 0xF7, 0x4E, 0x56, 0x60, 0xEF, 0xAF, 0xF7, 0x6C, 0x07, 0x2E, 0x45, 0x20, 0x9D,
        0x13, 0x0C, 0x94, 0xE1, 0x78, 0x71, 0xA3, 0xD0, 0x18, 0x38, 0xAD, 0xE4, 0x44, 0xE3, 0xB6, 0xE6,
        0x63, 0x2F, 0x9F, 0x46, 0x11, 0x69, 0x3C, 0x23, 0xDD, 0x08, 0x60, 0x84, 0x23, 0x71, 0x8B, 0xE7,
        0x44, 0x60, 0xE9, 0xB4, 0x51, 0x58, 0x31, 0x9B, 0x72, 0x77, 0x0F, 0x39, 0x56, 0xA4, 0xC7, 0xA1,
        0x4B, 0x35, 0xC8, 0xC9, 0xA3, 0x82, 0x88, 0x4F, 0x91, 0x3C, 0x8A, 0x7A, 0xE2, 0xC3, 0x89, 0xB4,
        0x02, 0x3C, 0x82, 0x7E, 0x9E, 0x2B, 0x19, 0xBE, 0xF8, 0x1C, 0x10, 0x39, 0xC4, 0x59, 0x94, 0xC3,
        0xA7, 0xE9, 0x82, 0x11, 0xA2, 0x0C, 0x40, 0x4C, 0x84, 0x1A, 0x31, 0xDA, 0x40, 0x8A, 0x74, 0x16,
        0x54, 0x91, 0x4F, 0xB0, 0x76, 0x74, 0xA1, 0xB0, 0xAE, 0x03, 0x17, 0x2B, 0xDA, 0x50, 0xCB, 0x71,
        0x9E, 0x8F, 0xCA, 0xD0, 0x67, 0xFA, 0xBB, 0xA5, 0xEE, 0x07, 0x02, 0xF4, 0x82, 0xC3, 0x1B, 0xEF,
        0x09, 0xF2, 0xC5, 0xA5, 0xAC, 0xFD, 0x3D, 0x3F, 0x54, 0x36, 0x92, 0xF7, 0x14, 0xD9, 0x56, 0x5E,
        0x0D, 0x76, 0x13, 0x5D, 0xC4, 0x20, 0x9D, 0x0F, 0x70, 0x05, 0x1B, 0xC8, 0xC9, 0x0B, 0x67, 0x70,
        0xBC, 0x14, 0xC6, 0x8B, 0x1F, 0xEC, 0xCD, 0xD9, 0xEB, 0x73, 0x9B, 0x4F, 0x9B, 0x29, 0xE8, 0xF2,
        0x82, 0xF1, 0x8C, 0xFF, 0x09, 0xE0, 0x63, 0x9E, 0x08, 0x20, 0xBC, 0x0E, 0x5B, 0x86, 0xB9, 0x00,
        0xC0, 0x7F, 0x1D, 0x0D, 0x74, 0x0F, 0x36, 0x02, 0x82, 0x34, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

    class Application {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "TestMethod") {
                return this.__process__TestMethod(connection, msg);
            }
            else if (member == "FirstSignal") {
                return this.__process__FirstSignal(connection, msg);
            }
            else if (member == "SecondSignal") {
                return this.__process__SecondSignal(connection, msg);
            }

            return false;
        }

        private static __process__TestMethod(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var ret: string = this.handle__TestMethod(connection, s1);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__FirstSignal(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            this.handle__FirstSignal(connection, s1, s2);

            return true;
        }

        private static __process__SecondSignal(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var s3: string = msg.body_Read_S();
            this.handle__SecondSignal(connection, s1, s2, s3);

            return true;
        }

        public static signal__FirstSignal(connection, s1: string, s2: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.allmake.TestInterface");
            msg.hdr_SetObjectPath("/TestInterface");
            msg.hdr_SetMember("FirstSignal");
            msg.hdr_SetSignature("ss");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_S(s2);
            connection.SendMsg(msg);
        }

        public static signal__SecondSignal(connection, s1: string, s2: string, s3: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.allmake.TestInterface");
            msg.hdr_SetObjectPath("/TestInterface");
            msg.hdr_SetMember("SecondSignal");
            msg.hdr_SetSignature("sss");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_S(s2);
            msg.body_Write_S(s3);
            connection.SendMsg(msg);
        }

        private static handle__TestMethod(connection, s1: string): string {
            return "default-string";
        }

        private static handle__FirstSignal(connection, s1: string, s2: string): void {
        }

        private static handle__SecondSignal(connection, s1: string, s2: string, s3: string): void {
        }
    }
}
