var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AJ;
(function (AJ) {
    //==============================================================================================================
    // FIXED IMPLEMENTATION BELOW
    //==============================================================================================================
    var Endianness;
    (function (Endianness) {
        Endianness[Endianness["LittleEndian"] = 0] = "LittleEndian";
        Endianness[Endianness["BigEndian"] = 1] = "BigEndian";
    })(Endianness || (Endianness = {}));
    ;
    (function (MsgType) {
        MsgType[MsgType["MethodCall"] = 0] = "MethodCall";
        MsgType[MsgType["MethodReturn"] = 1] = "MethodReturn";
        MsgType[MsgType["Error"] = 2] = "Error";
        MsgType[MsgType["Signal"] = 3] = "Signal";
        MsgType[MsgType["Unknown"] = 4] = "Unknown";
    })(AJ.MsgType || (AJ.MsgType = {}));
    var MsgType = AJ.MsgType;
    var FieldType;
    (function (FieldType) {
        FieldType[FieldType["Path"] = 1] = "Path";
        FieldType[FieldType["Interface"] = 2] = "Interface";
        FieldType[FieldType["Member"] = 3] = "Member";
        FieldType[FieldType["ErrorName"] = 4] = "ErrorName";
        FieldType[FieldType["ReplySerial"] = 5] = "ReplySerial";
        FieldType[FieldType["Destination"] = 6] = "Destination";
        FieldType[FieldType["Sender"] = 7] = "Sender";
        FieldType[FieldType["Signature"] = 8] = "Signature";
    })(FieldType || (FieldType = {}));
    var MsgGeneric = (function () {
        /* ------------------------------------------------------------------------------------------------------- */
        /*  CONSTRUCTORS                                                                                           */
        /* ------------------------------------------------------------------------------------------------------- */
        function MsgGeneric(t) {
            // just small buffer initially
            this.m_array_nesting = -1;
            this.m_array_position = new Array(10);
            this.m_WritingBody = false;
            this.m_Data = null;
            this.m_Reply = null;
            this.m_ReplyCb = null;
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
        MsgGeneric.prototype.FromBuffer = function (bytes) {
            if (bytes.length >= 16) {
                console.log(bytes);
                this.m_Data = bytes;
                var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
                console.log("length : " + length);
                if ((bytes.length >= length) && (length < 1024)) {
                    this.m_Data = new Uint8Array(length);
                    if (bytes.length == length) {
                        this.m_Data.set(bytes);
                    }
                    else {
                        this.m_Data.set(bytes.subarray(0, length));
                    }
                    return length;
                }
            }
            this.m_Data = null;
            return 0;
        };
        MsgGeneric.prototype.CreateReply = function () {
            this.m_Reply = new MsgGeneric(MsgType.MethodReturn);
            this.m_Reply.hdr_SetDestination(this.hdr_GetSender());
            this.m_Reply.hdr_SetSender(this.hdr_GetDestination());
            this.m_Reply.hdr_SetReplySerial(this.hdr_GetSerialNumber());
        };
        /* ------------------------------------------------------------------------------------------------------- */
        /*  PUBLIC MESSAGE HEADERS INTERFACE                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.hdr_GetEndianness = function () {
            return (this.m_Data[0] == 0x6c) ? Endianness.LittleEndian : Endianness.BigEndian;
        };
        MsgGeneric.prototype.hdr_SetEndianness = function (value) {
            if (value == Endianness.LittleEndian)
                this.m_Data[0] = 0x6c;
            else
                this.m_Data[0] = 0x42;
        };
        MsgGeneric.prototype.hdr_GetMsgType = function () {
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
        };
        MsgGeneric.prototype.hdr_SetMsgType = function (value) {
            switch (value) {
                case MsgType.MethodCall:
                    this.m_Data[1] = 1;
                    break;
                case MsgType.MethodReturn:
                    this.m_Data[1] = 2;
                    break;
                case MsgType.Error:
                    this.m_Data[1] = 3;
                    break;
                case MsgType.Signal:
                    this.m_Data[1] = 4;
                    break;
                default:
                    this.m_Data[1] = 0;
                    break;
            }
        };
        MsgGeneric.prototype.hdr_GetNoReplyExpected = function () {
            return (0 != (this.m_Data[2] & 0x01));
        };
        MsgGeneric.prototype.hdr_SetNoReplyExpected = function (value) {
            if (value)
                this.SetFlag(0x01);
            else
                this.ClearFlag(0x01);
        };
        MsgGeneric.prototype.hdr_GetAutoStart = function () {
            return (0 != (this.m_Data[2] & 0x02));
        };
        MsgGeneric.prototype.hdr_SetAutoStart = function (value) {
            if (value)
                this.SetFlag(0x02);
            else
                this.ClearFlag(0x02);
        };
        MsgGeneric.prototype.hdr_GetAllowRemoteMsg = function () {
            return (0 != (this.m_Data[2] & 0x04));
        };
        MsgGeneric.prototype.hdr_SetAllowRemoteMsg = function (value) {
            if (value)
                this.SetFlag(0x04);
            else
                this.ClearFlag(0x04);
        };
        MsgGeneric.prototype.hdr_GetSessionless = function () {
            return (0 != (this.m_Data[2] & 0x10));
        };
        MsgGeneric.prototype.hdr_SetSessionless = function (value) {
            if (value)
                this.SetFlag(0x10);
            else
                this.ClearFlag(0x10);
        };
        MsgGeneric.prototype.hdr_GetGlobalBroadcast = function () {
            return (0 != (this.m_Data[2] & 0x20));
        };
        MsgGeneric.prototype.hdr_SetGlobalBroadcast = function (value) {
            if (value)
                this.SetFlag(0x20);
            else
                this.ClearFlag(0x20);
        };
        MsgGeneric.prototype.hdr_GetCompressed = function () {
            return (0 != (this.m_Data[2] & 0x40));
        };
        MsgGeneric.prototype.hdr_SetCompressed = function (value) {
            if (value)
                this.SetFlag(0x40);
            else
                this.ClearFlag(0x40);
        };
        MsgGeneric.prototype.hdr_GetEncrypted = function () {
            return (0 != (this.m_Data[2] & 0x80));
        };
        MsgGeneric.prototype.hdr_SetEncrypted = function (value) {
            if (value)
                this.SetFlag(0x80);
            else
                this.ClearFlag(0x80);
        };
        MsgGeneric.prototype.hdr_GetMajorVersion = function () {
            return this.m_Data[3];
        };
        MsgGeneric.prototype.hdr_SetMajorVersion = function (value) {
            this.m_Data[3] = value;
        };
        MsgGeneric.prototype.hdr_GetBodyLength = function () {
            return this.GetUintAt(4);
        };
        MsgGeneric.prototype.hdr_SetBodyLength = function (value) {
            this.SetUintAt(4, value);
        };
        MsgGeneric.prototype.hdr_GetSerialNumber = function () {
            return this.GetUintAt(8);
        };
        MsgGeneric.prototype.hdr_SetSerialNumber = function (value) {
            this.SetUintAt(8, value);
        };
        MsgGeneric.prototype.hdr_GetHeaderLength = function () {
            return this.GetUintAt(12);
        };
        MsgGeneric.prototype.hdr_SetHeaderLength = function (value) {
            this.SetUintAt(12, value);
        };
        MsgGeneric.prototype.hdr_GetObjectPath = function () {
            return this._ExtractFieldFromHeader(FieldType.Path);
        };
        MsgGeneric.prototype.hdr_SetObjectPath = function (value) {
            this.AddField(FieldType.Path, value);
        };
        MsgGeneric.prototype.hdr_GetInterface = function () {
            return this._ExtractFieldFromHeader(FieldType.Interface);
        };
        MsgGeneric.prototype.hdr_SetInterface = function (value) {
            this.AddField(FieldType.Interface, value);
        };
        MsgGeneric.prototype.hdr_GetMember = function () {
            return this._ExtractFieldFromHeader(FieldType.Member);
        };
        MsgGeneric.prototype.hdr_SetMember = function (value) {
            this.AddField(FieldType.Member, value);
        };
        MsgGeneric.prototype.hdr_GetDestination = function () {
            return this._ExtractFieldFromHeader(FieldType.Destination);
        };
        MsgGeneric.prototype.hdr_SetDestination = function (value) {
            this.AddField(FieldType.Destination, value);
        };
        MsgGeneric.prototype.hdr_GetSender = function () {
            return this._ExtractFieldFromHeader(FieldType.Sender);
        };
        MsgGeneric.prototype.hdr_SetSender = function (value) {
            this.AddField(FieldType.Sender, value);
        };
        MsgGeneric.prototype.hdr_GetReplySerial = function () {
            var o = this._ExtractFieldFromHeader(FieldType.ReplySerial);
            return (null != o) ? o : 0;
        };
        MsgGeneric.prototype.hdr_SetReplySerial = function (value) {
            this.AddField(FieldType.ReplySerial, value);
        };
        MsgGeneric.prototype.hdr_GetSignature = function () {
            return this._ExtractFieldFromHeader(FieldType.Signature);
        };
        MsgGeneric.prototype.hdr_SetSignature = function (value) {
            this.AddField(FieldType.Signature, value);
        };
        MsgGeneric.prototype.hdr_GetErrorName = function () {
            return this._ExtractFieldFromHeader(FieldType.ErrorName);
        };
        MsgGeneric.prototype.hdr_SetErrorName = function (value) {
            this.AddField(FieldType.ErrorName, value);
        };
        /* ------------------------------------------------------------------------------------------------------- */
        /*  WRITING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.body_StartWriting = function () {
            this.m_WritingBody = true;
            this.m_position = 16 + this.RoundedHeaderLength();
        };
        MsgGeneric.prototype.body_Write_Y = function (v) {
            this.EnsureBufferSize(1);
            this.SetByteAt(this.m_position++, v);
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_B = function (v) {
            this.body_Write_I(v ? 1 : 0);
        };
        MsgGeneric.prototype.body_Write_N = function (v) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);
            this.m_position += 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_Q = function (v) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);
            this.m_position += 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_I = function (v) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);
            this.m_position += 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_U = function (v) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);
            this.m_position += 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_S = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4 + 1);
            this.SetUintAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 4, v);
            this.m_position += 4 + v.length + 1;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_O = function (v) {
            this.body_Write_S(v);
        };
        MsgGeneric.prototype.body_Write_G = function (v) {
            this.EnsureBufferSize(1 + v.length + 1);
            this.SetByteAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 1, v);
            this.m_position += 1 + v.length + 1;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AY = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4);
            this.SetUintAt(this.m_position, v.length);
            this.SetBytesAt(this.m_position + 4, v);
            this.m_position += 4 + v.length;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AN = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);
            this.body_Write_U(v.length * 2);
            for (var i = 0; i < v.length; i++) {
                // XXX - make sure it's converted correctly
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }
            this.m_position += v.length * 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AQ = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);
            this.body_Write_U(v.length * 2);
            for (var i = 0; i < v.length; i++) {
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }
            this.m_position += v.length * 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AI = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);
            this.body_Write_U(v.length * 4);
            for (var i = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }
            this.m_position += v.length * 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AU = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);
            this.body_Write_U(v.length * 4);
            for (var i = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }
            this.m_position += v.length * 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_R_Start = function () {
            this.Align(8);
        };
        MsgGeneric.prototype.body_Write_A_Start = function () {
            this.Align(4); // XXX - is this correct?
            // store beginning of the array position
            this.m_array_position[++this.m_array_nesting] = this.m_position;
            // and write array size, for now it's going to be 0
            this.body_Write_U(0);
        };
        MsgGeneric.prototype.body_Write_A_End = function (eight_byte_padding) {
            // XXX - take care about element alignment
            var temp_position = this.m_position;
            var padding_offset = 0;
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
        };
        MsgGeneric.prototype.body_Write_V = function (v, sig) {
            this.body_Write_G(sig);
            this.body_WriteObject(sig, v);
        };
        MsgGeneric.prototype.body_WriteRaw = function (data) {
            this.EnsureBufferSize(data.length);
            this.SetBytesAt(this.m_position, data);
            this.m_position += data.length;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_WriteObject = function (sig, v) {
            switch (sig) {
                case "s":
                case "o":
                    this.body_Write_S(v);
                    return;
                case "g":
                    this.body_Write_G(v);
                    return;
                case "b":
                    this.body_Write_B(v);
                    return;
                case "y":
                    this.body_Write_Y(v);
                    return;
                case "n":
                    this.body_Write_N(v);
                    return;
                case "q":
                    this.body_Write_Q(v);
                    return;
                case "i":
                    this.body_Write_I(v);
                    return;
                case "u":
                    this.body_Write_U(v);
                    return;
                case "ay":
                    this.body_Write_AY(v);
                    return;
                case "an":
                    this.body_Write_AN(v);
                    return;
                case "aq":
                    this.body_Write_AQ(v);
                    return;
                case "ai":
                    this.body_Write_AI(v);
                    return;
                case "au":
                    this.body_Write_AU(v);
                    return;
            }
            if (sig[0] == 'a') {
                this.body_Write_A_Start();
                if (sig[1] == '{') {
                    var d = v;
                    for (var _i = 0, d_1 = d; _i < d_1.length; _i++) {
                        var k = d_1[_i];
                        this.body_WriteObject(MsgGeneric.GetSubSignature(sig, 1), k);
                    }
                }
                else {
                    var l = v;
                    for (var _a = 0, l_1 = l; _a < l_1.length; _a++) {
                        var o = l_1[_a];
                        this.body_WriteObject(MsgGeneric.GetSubSignature(sig, 1), o);
                    }
                }
                this.body_Write_A_End((sig[1] == '{') || (sig[1] == '('));
            }
            else if (sig[0] == '{') {
                // XXX - keyvalue pair will be array with 2 elemenst for now
                var kv = v;
                this.Align(8);
                var ss = MsgGeneric.GetSubSignature(sig, 1);
                this.body_WriteObject(ss, kv[0]);
                ss = MsgGeneric.GetSubSignature(sig, 1 + ss.length);
                this.body_WriteObject(ss, kv[1]);
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var idx = 1;
                for (var _b = 0, _c = v; _b < _c.length; _b++) {
                    var o = _c[_b];
                    var ss = MsgGeneric.GetSubSignature(sig, idx);
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
        };
        MsgGeneric.prototype.body_UpdateLength = function () {
            if (this.m_WritingBody) {
                this.hdr_SetBodyLength(this.m_position - (16 + this.RoundedHeaderLength()));
            }
        };
        MsgGeneric.prototype.body_Write_AS = function (v) {
            this.body_Write_A_Start();
            for (var _i = 0, v_1 = v; _i < v_1.length; _i++) {
                var k = v_1[_i];
                this.body_Write_S(k);
            }
            this.body_Write_A_End(false);
        };
        ;
        MsgGeneric.prototype.body_Write_ROAS = function (v) {
            this.Align(8);
            this.body_Write_O(v[0]);
            this.body_Write_AS(v[1]);
        };
        ;
        MsgGeneric.prototype.body_Write_AROAS = function (v) {
            this.body_Write_A_Start();
            for (var _i = 0, v_2 = v; _i < v_2.length; _i++) {
                var k = v_2[_i];
                this.body_Write_ROAS(k);
            }
            this.body_Write_A_End(true);
        };
        ;
        /* ------------------------------------------------------------------------------------------------------- */
        /*  READING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.body_StartReading = function () {
            this.m_position = 16 + this.RoundedHeaderLength();
        };
        MsgGeneric.prototype.body_Read_Y = function () {
            return this.GetByteAt(this.m_position++);
        };
        MsgGeneric.prototype.body_Read_B = function () {
            return (0 != this.body_Read_I());
        };
        MsgGeneric.prototype.body_Read_N = function () {
            this.Align(2);
            var ret = this.GetUint16At(this.m_position);
            if (ret > 0x7fff)
                ret -= 0x10000;
            this.m_position += 2;
            return ret;
        };
        MsgGeneric.prototype.body_Read_Q = function () {
            this.Align(2);
            var ret = this.GetUint16At(this.m_position);
            this.m_position += 2;
            return ret;
        };
        MsgGeneric.prototype.body_Read_I = function () {
            this.Align(4);
            var ret = this.GetUintAt(this.m_position);
            if (ret > 0x7fffffff)
                ret -= 0x100000000;
            this.m_position += 4;
            return ret;
        };
        MsgGeneric.prototype.body_Read_U = function () {
            this.Align(4);
            var ret = this.GetUintAt(this.m_position);
            this.m_position += 4;
            return ret;
        };
        MsgGeneric.prototype.body_Read_S = function () {
            var arr = this.body_Read_AY();
            // XXX - strings are null terminated, so increment position
            this.m_position++;
            return String.fromCharCode.apply(null, arr);
        };
        MsgGeneric.prototype.body_Read_G = function () {
            var length = this.body_Read_Y();
            if (this.m_position + length <= this.m_Data.length) {
                var buffer = new Int8Array(length);
                for (var i = 0; i < length; i++) {
                    buffer[i] = this.m_Data[this.m_position++];
                }
                // XXX - strings are null terminated, so increment position
                this.m_position++;
                return String.fromCharCode.apply(null, buffer);
            }
            return "";
        };
        MsgGeneric.prototype.body_ReadArrayLength = function () {
            return this.body_Read_I();
        };
        MsgGeneric.prototype.body_Read_AY = function () {
            var length = this.body_Read_I();
            var ret = null;
            if (this.m_position + length <= this.m_Data.length) {
                ret = new Uint8Array(length);
                for (var i = 0; i < length; i++) {
                    ret[i] = this.m_Data[this.m_position++];
                }
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AN = function () {
            var length = this.body_Read_I();
            var ret = new Int16Array(length / 2);
            for (var i = 0; i < length / 2; i++) {
                ret[i] = this.body_Read_N();
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AQ = function () {
            var length = this.body_Read_I();
            var ret = new Uint16Array(length / 2);
            for (var i = 0; i < length / 2; i++) {
                ret[i] = this.body_Read_Q();
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AI = function () {
            var length = this.body_Read_I();
            var ret = new Int32Array(length / 4);
            for (var i = 0; i < length / 4; i++) {
                ret[i] = this.body_Read_I();
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AU = function () {
            var length = this.body_Read_I();
            var ret = new Uint32Array(length / 4);
            for (var i = 0; i < length / 4; i++) {
                ret[i] = this.body_Read_U();
            }
            return ret;
        };
        MsgGeneric.prototype.body_ReadObject = function (sig) {
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
                var size = this.body_ReadArrayLength();
                var end = this.m_position + size;
                var ss = MsgGeneric.GetSubSignature(sig, 1);
                if (ss[0] == '{') {
                    var ret = new Array();
                    while (this.m_position < end) {
                        var kv = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }
                else {
                    // XXX - now it's the same as in case of a{
                    var ret = new Array();
                    while (this.m_position < end) {
                        var kv = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }
                return ret;
            }
            else if (sig[0] == '{') {
                this.Align(8);
                var subSignature = MsgGeneric.GetSubSignature(sig, 1);
                var k = this.body_ReadObject(subSignature);
                subSignature = MsgGeneric.GetSubSignature(sig, 1 + subSignature.length);
                var v = this.body_ReadObject(subSignature);
                var ret = new Array(2);
                ret[0] = k;
                ret[1] = v;
                return ret;
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var ret = new Array();
                var subSignature = "";
                var idx = 1;
                while (sig[idx + subSignature.length] != ')') {
                    idx += subSignature.length;
                    subSignature = MsgGeneric.GetSubSignature(sig, idx);
                    ret.push(this.body_ReadObject(subSignature));
                }
                return ret;
            }
            else if (sig == "v") {
                return this.body_Read_V();
            }
        };
        MsgGeneric.prototype.body_Read_V = function () {
            var sig = this.body_Read_G();
            return this.body_ReadObject(sig);
        };
        MsgGeneric.prototype.body_Read_AS = function () {
            var length = this.body_Read_I();
            var end = this.m_position + length;
            var ret = new Array();
            while (this.m_position < end)
                ret.push(this.body_Read_S());
            return ret;
        };
        ;
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
        MsgGeneric.prototype.SetFlag = function (flag) {
            this.m_Data[2] |= flag;
        };
        MsgGeneric.prototype.ClearFlag = function (flag) {
            this.m_Data[2] &= ~flag;
        };
        MsgGeneric.prototype.SetFlags = function (f) {
            this.m_Data[2] = f;
        };
        MsgGeneric.prototype._ExtractFieldFromHeader = function (t) {
            var temp_position = this.m_position;
            var o = this._ExtractFieldFromHeaderX(t);
            this.m_position = temp_position;
            return o;
        };
        MsgGeneric.prototype._ExtractFieldFromHeaderX = function (t) {
            this.m_position = 16;
            while (this.m_position < 16 + this.RoundedHeaderLength()) {
                var field = this.body_Read_Y();
                var signature = this.body_Read_G();
                switch (field) {
                    case FieldType.Path:
                        if (signature != "o")
                            return null;
                        break;
                    case FieldType.Interface:
                    case FieldType.Member:
                    case FieldType.Destination:
                    case FieldType.Sender:
                    case FieldType.ErrorName:
                        if (signature != "s")
                            return null;
                        break;
                    case FieldType.Signature:
                        if (signature != "g")
                            return null;
                        break;
                    case FieldType.ReplySerial:
                        if (signature != "u")
                            return null;
                        break;
                    default:
                        return null;
                }
                var str = null;
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
        };
        MsgGeneric.prototype.AddField = function (t, v) {
            // can't add fields if body is already started (for simplicity)
            if (this.hdr_GetBodyLength() > 0)
                return;
            this.m_position = 16 + this.RoundedHeaderLength();
            this.EnsureBufferSize(128);
            switch (t) {
                case FieldType.Path:
                    this.m_Data[this.m_position] = 0x01;
                    break;
                case FieldType.Interface:
                    this.m_Data[this.m_position] = 0x02;
                    break;
                case FieldType.Member:
                    this.m_Data[this.m_position] = 0x03;
                    break;
                case FieldType.Destination:
                    this.m_Data[this.m_position] = 0x06;
                    break;
                case FieldType.Sender:
                    this.m_Data[this.m_position] = 0x07;
                    break;
                case FieldType.Signature:
                    this.m_Data[this.m_position] = 0x08;
                    break;
                case FieldType.ErrorName:
                    this.m_Data[this.m_position] = 0x04;
                    break;
                case FieldType.ReplySerial:
                    this.m_Data[this.m_position] = 0x05;
                    break;
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
        };
        MsgGeneric.prototype.SetByteAt = function (idx, b) {
            this.m_Data[idx] = b;
        };
        MsgGeneric.prototype.SetUintAt = function (idx, u) {
            this.m_Data[idx] = (u & 0xff);
            this.m_Data[idx + 1] = ((u >> 8) & 0xff);
            this.m_Data[idx + 2] = ((u >> 16) & 0xff);
            this.m_Data[idx + 3] = ((u >> 24) & 0xff);
        };
        MsgGeneric.prototype.SetUint16At = function (idx, u) {
            this.m_Data[idx] = (u & 0x0ff);
            this.m_Data[idx + 1] = ((u & 0x0ff00) >> 8);
        };
        MsgGeneric.prototype.SetStringAt = function (idx, s) {
            var length = s.length;
            for (var i = 0; i < length; i++) {
                this.m_Data[idx + i] = s.charCodeAt(i);
            }
            this.m_Data[idx + length] = 0;
        };
        MsgGeneric.prototype.SetBytesAt = function (idx, data) {
            this.m_Data.set(data, idx);
        };
        MsgGeneric.prototype.GetByteAt = function (idx) {
            if (idx + 1 <= this.m_Data.length) {
                return this.m_Data[idx];
            }
            else {
                return 0;
            }
        };
        MsgGeneric.prototype.GetUintAt = function (idx) {
            if (idx + 4 <= this.m_Data.length) {
                return this.m_Data[idx] +
                    (this.m_Data[idx + 1]) * 256 +
                    (this.m_Data[idx + 2]) * 256 * 256 +
                    (this.m_Data[idx + 3]) * 256 * 256 * 256;
            }
            else {
                return 0;
            }
        };
        MsgGeneric.prototype.GetUint16At = function (idx) {
            if (idx + 2 <= this.m_Data.length) {
                return this.m_Data[idx] + this.m_Data[idx + 1] * 256;
            }
            else {
                return 0;
            }
        };
        MsgGeneric.prototype.RoundedHeaderLength = function () {
            return Math.floor((this.hdr_GetHeaderLength() + 7) / 8) * 8;
        };
        MsgGeneric.prototype.GetBuffer = function () {
            var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
            return this.m_Data.subarray(0, length);
        };
        MsgGeneric.prototype.GetBodyBuffer = function () {
            var idx = 16 + this.RoundedHeaderLength();
            var length = this.hdr_GetBodyLength();
            return this.m_Data.subarray(idx, length);
        };
        MsgGeneric.prototype.Align = function (alignment) {
            this.m_position = Math.floor((this.m_position + alignment - 1) / alignment) * alignment;
        };
        MsgGeneric.prototype.EnsureBufferSize = function (size) {
            size += this.m_position;
            if (size <= this.m_Data.length)
                return;
            var nb = new Uint8Array(size);
            nb.set(this.m_Data);
            this.m_Data = nb;
        };
        /* ------------------------------------------------------------------------------------------------------- */
        /*  SIGNATURE HELPER                                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.ValidateSignature = function (signature, single) {
            if ((null == signature) || (0 == signature.length))
                return false;
            var count = 0;
            var idx = 0;
            while (idx < signature.length) {
                var ss = MsgGeneric.GetSubSignature(signature, idx);
                if (null == ss)
                    return false;
                idx += ss.length;
                count++;
            }
            if (single && (count > 1))
                return false;
            return true;
        };
        MsgGeneric.GetSubSignature = function (signature, idx) {
            var end = MsgGeneric.GetSubSignatureEnd(signature, idx);
            if (end > 0) {
                return signature.substring(idx, end);
            }
            else {
                return null;
            }
        };
        MsgGeneric.GetSubSignatureEnd = function (signature, idx) {
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
                        idx = MsgGeneric.GetSubSignatureEnd(signature, idx);
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
                    return MsgGeneric.GetSubSignatureEnd(signature, idx + 1);
                case '{':
                    idx = MsgGeneric.GetSubSignatureEnd(signature, idx + 1);
                    if (idx > 0) {
                        idx = MsgGeneric.GetSubSignatureEnd(signature, idx);
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
        };
        MsgGeneric.m_NextSerialNumber = Math.floor(Math.random() * 32000);
        return MsgGeneric;
    }());
    AJ.MsgGeneric = MsgGeneric;
    var ConnectorState;
    (function (ConnectorState) {
        ConnectorState[ConnectorState["StateDisconnected"] = 0] = "StateDisconnected";
        ConnectorState[ConnectorState["StateTransportConnecting"] = 1] = "StateTransportConnecting";
        ConnectorState[ConnectorState["StateAuthAnonumousSent"] = 2] = "StateAuthAnonumousSent";
        ConnectorState[ConnectorState["StateInformProtoVersionSent"] = 3] = "StateInformProtoVersionSent";
        ConnectorState[ConnectorState["StateBeginSent"] = 4] = "StateBeginSent";
        ConnectorState[ConnectorState["StateHelloSent"] = 5] = "StateHelloSent";
        ConnectorState[ConnectorState["StateConnected"] = 6] = "StateConnected";
    })(ConnectorState || (ConnectorState = {}));
    ;
    (function (ConnectorEventType) {
        ConnectorEventType[ConnectorEventType["ConnectorEventNone"] = 0] = "ConnectorEventNone";
        ConnectorEventType[ConnectorEventType["ConnectorEventConnected"] = 1] = "ConnectorEventConnected";
        ConnectorEventType[ConnectorEventType["ConnectorEventConnectionFailed"] = 2] = "ConnectorEventConnectionFailed";
        ConnectorEventType[ConnectorEventType["ConnectorEventProcessRequested"] = 3] = "ConnectorEventProcessRequested";
        ConnectorEventType[ConnectorEventType["ConnectorEventTextReceived"] = 4] = "ConnectorEventTextReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventTextSent"] = 5] = "ConnectorEventTextSent";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReceived"] = 6] = "ConnectorEventMsgReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgSent"] = 7] = "ConnectorEventMsgSent";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReplyReceived"] = 8] = "ConnectorEventMsgReplyReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReplySent"] = 9] = "ConnectorEventMsgReplySent";
    })(AJ.ConnectorEventType || (AJ.ConnectorEventType = {}));
    var ConnectorEventType = AJ.ConnectorEventType;
    ;
    var ApplicationBase = (function () {
        function ApplicationBase() {
        }
        return ApplicationBase;
    }());
    AJ.ApplicationBase = ApplicationBase;
    ;
    var ConnectorBase = (function () {
        function ConnectorBase() {
            this.m_Buffer = null;
            this.m_LocalNodeId = "";
            this.m_AssignedBusName = "";
            this.m_PeerNodeId = "";
            this.m_EventHandler = null;
            this.m_CalledMethods = new Array();
            this.m_Application = null;
            this.m_AnnouncementListener = null;
        }
        ConnectorBase.prototype.ConnectAndAuthenticate = function () {
            this.m_State = ConnectorState.StateTransportConnecting;
            this.ConnectTransport();
        };
        ConnectorBase.prototype.Disconnect = function () {
            this.DisconnectTransport();
        };
        ConnectorBase.prototype.SetApplication = function (application) {
            this.m_Application = application;
        };
        ConnectorBase.prototype.GetApplication = function () {
            return this.m_Application;
        };
        ConnectorBase.prototype.GetLocalNodeId = function () {
            return this.m_LocalNodeId;
        };
        ConnectorBase.prototype.SetAnnouncementListener = function (listener) {
            this.m_AnnouncementListener = listener;
        };
        ConnectorBase.prototype.OnTransportConnected = function (ok) {
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
        };
        ConnectorBase.prototype.OnDataReceived = function (data) {
            if (null != this.m_Buffer) {
                var a = new Uint8Array(this.m_Buffer.length + data.length);
                var offset = this.m_Buffer.length;
                for (var i = 0; i < offset; i++)
                    a[i] = this.m_Buffer[i];
                for (var i = 0; i < data.length; i++)
                    a[i + offset] = data[i];
                this.m_Buffer = a;
            }
            else {
                this.m_Buffer = data;
            }
            this.Process();
        };
        ConnectorBase.prototype.Process = function () {
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
                var line = this.ReceiveLine();
                if (line.substr(0, 3) == "OK ") {
                    this.SendLine("INFORM_PROTO_VERSION 12\r\n");
                    this.m_State = ConnectorState.StateInformProtoVersionSent;
                }
            }
            else if (ConnectorState.StateInformProtoVersionSent == this.m_State) {
                var line = this.ReceiveLine();
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
                    var msg = new AJ.MsgGeneric(AJ.MsgType.Unknown);
                    var length = msg.FromBuffer(this.m_Buffer);
                    if (0 == length)
                        break;
                    this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgReceived, msg);
                    var t = msg.hdr_GetMsgType();
                    if ((MsgType.Signal == t) || (MsgType.MethodCall == t)) {
                        var iface = msg.hdr_GetInterface();
                        if (iface == "org.freedesktop.DBus.Peer")
                            org_freedesktop_dbus_peer._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Introspectable")
                            org_freedesktop_dbus_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.allseen.Introspectable")
                            org_allseen_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.About")
                            org_alljoyn_about._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Icon")
                            org_alljoyn_icon._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus")
                            org_freedesktop_dbus._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus")
                            org_alljoyn_bus._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Properties")
                            org_freedesktop_dbus_properties._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Daemon")
                            org_alljoyn_daemon._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Session")
                            org_alljoyn_bus_peer_session._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Authentication")
                            org_alljoyn_bus_peer_authentication._ProcessMsg(this, msg);
                        else if (null != this.m_Application)
                            this.m_Application._ProcessMsg(this, msg);
                        if (msg.m_Reply != null)
                            this.SendMsg(msg.m_Reply);
                    }
                    else if (t == MsgType.MethodReturn) {
                        var i = 0;
                        var sent = null;
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
                        var old_buffer = this.m_Buffer;
                        this.m_Buffer = new Uint8Array(old_buffer.length - length);
                        for (var i = 0; i < old_buffer.length - length; i++)
                            this.m_Buffer[i] = old_buffer[length + i];
                    }
                    else {
                        this.m_Buffer = null;
                    }
                }
            }
        };
        ConnectorBase.prototype.SendHello = function () {
            var __this__ = this;
            org_freedesktop_dbus.method__Hello(this, function (connection, bus) {
                __this__.m_LocalNodeId = bus;
                __this__.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnected, null);
                __this__.m_State = ConnectorState.StateConnected;
                if (__this__.m_Application != null) {
                    __this__.BindSessionPort();
                }
                else {
                    __this__.AttachSession();
                }
                if (__this__.m_AnnouncementListener != null) {
                    org_freedesktop_dbus.method__AddMatch(__this__, "org.alljoyn.About", "Announce", null);
                }
            });
        };
        ConnectorBase.prototype.BindSessionPort = function () {
            var __this__ = this;
            org_alljoyn_bus.method__BindSessionPort(this, 2, 0, function (connection, disposition, portOut) {
                org_alljoyn_about.signal__Announce(connection, 1, 2, null, null);
            });
        };
        ConnectorBase.prototype.AttachSession = function () {
        };
        ConnectorBase.prototype.SendLine = function (buffer) {
            var a = new Uint8Array(buffer.length);
            for (var i = 0; i < buffer.length; i++)
                a[i] = buffer.charCodeAt(i);
            this.WriteData(a);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextSent, buffer);
        };
        ConnectorBase.prototype.ReceiveLine = function () {
            // XXX - this is not quite correct
            var line = String.fromCharCode.apply(null, this.m_Buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextReceived, line);
            // XXX - this is not correct either
            this.m_Buffer = null;
            return line;
        };
        ConnectorBase.prototype.SendMsg = function (msg) {
            var buffer = msg.GetBuffer();
            this.WriteData(buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgSent, msg);
        };
        ConnectorBase.prototype.SendMsgWithCallback = function (msg, cb) {
            msg.m_ReplyCb = cb;
            this.m_CalledMethods.push(msg);
            this.SendMsg(msg);
        };
        ConnectorBase.prototype.SetConnectorEvent = function (e) {
            this.m_EventHandler = e;
        };
        ConnectorBase.prototype.QueueConnectorEvent = function (e, d) {
            // XXX - no queue for timebeing
            this.NotifyConnectorEvent(e, d);
        };
        ConnectorBase.prototype.NotifyConnectorEvent = function (e, d) {
            if (null != this.m_EventHandler) {
                this.m_EventHandler(e, d);
            }
        };
        return ConnectorBase;
    }());
    AJ.ConnectorBase = ConnectorBase;
    ;
    //==============================================================================================================
    // org.alljoyn.About - producer
    //==============================================================================================================
    var org_alljoyn_about = (function () {
        function org_alljoyn_about() {
        }
        org_alljoyn_about._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_alljoyn_about.__process__GetAboutData = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var ret = this.handle__GetAboutData(connection, s1);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_about.__process__GetObjectDescription = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetObjectDescription(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(oas)");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_about.__process__Announce = function (connection, msg) {
            msg.body_StartReading();
            var q1 = msg.body_Read_Q();
            var q2 = msg.body_Read_Q();
            var o1 = msg.body_ReadObject("a(oas)");
            var o2 = msg.body_ReadObject("a{sv}");
            this.handle__Announce(connection, q1, q2, o1, o2);
            return true;
        };
        org_alljoyn_about.signal__Announce = function (connection, q1, q2, o1, o2) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            var application = connection.GetApplication();
            msg.hdr_SetSessionless(true);
            msg.hdr_SetObjectPath("/About");
            msg.hdr_SetInterface("org.alljoyn.About");
            msg.hdr_SetMember("Announce");
            msg.hdr_SetSignature("qqa(oas)a{sv}");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(q1);
            msg.body_Write_Q(q2);
            // at this time we will write array elements manually
            //msg.body_WriteObject("a(oas)", [
            msg.body_Write_AROAS([
                ["/About", ["org.alljoyn.About"]],
                ["/About/DeviceIcon", ["org.alljoyn.Icon"]],
                ["/TestInterface", ["org.allmake.TestInterface"]]]);
            msg.body_Write_A_Start();
            msg.body_Write_R_Start();
            msg.body_Write_S("AppId");
            msg.body_Write_V(application.GetId(), "ay");
            msg.body_Write_R_Start();
            msg.body_Write_S("AppName");
            msg.body_Write_V(application.GetName(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("DeviceId");
            msg.body_Write_V(application.GetDeviceId(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("DeviceName");
            msg.body_Write_V(application.GetDeviceName(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("Manufacturer");
            msg.body_Write_V(application.GetManufacturer(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("ModelNumber");
            msg.body_Write_V(application.GetModelNumber(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("SupportedLanguages");
            msg.body_Write_V(new Array("en"), "as");
            msg.body_Write_R_Start();
            msg.body_Write_S("Description");
            msg.body_Write_V(application.GetDescription(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("DefaultLanguage");
            msg.body_Write_V("en", "s");
            msg.body_Write_A_End(true);
            connection.SendMsg(msg);
        };
        org_alljoyn_about.handle__GetAboutData = function (connection, s1) {
            return 0;
        };
        org_alljoyn_about.handle__GetObjectDescription = function (connection) {
            return 0;
        };
        org_alljoyn_about.handle__Announce = function (connection, q1, q2, o1, o2) {
        };
        return org_alljoyn_about;
    }());
    //==============================================================================================================
    // org.alljoyn.Icon - producer
    //==============================================================================================================
    var org_alljoyn_icon = (function () {
        function org_alljoyn_icon() {
        }
        org_alljoyn_icon._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "GetUrl") {
                return this.__process__GetUrl(connection, msg);
            }
            else if (member == "GetContent") {
                return this.__process__GetContent(connection, msg);
            }
            return false;
        };
        org_alljoyn_icon.__process__GetUrl = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetUrl(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_icon.__process__GetContent = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetContent(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);
            return true;
        };
        org_alljoyn_icon.handle__GetUrl = function (connection) {
            return "";
        };
        org_alljoyn_icon.handle__GetContent = function (connection) {
            return connection.GetApplication().GetIcon();
        };
        return org_alljoyn_icon;
    }());
    //==============================================================================================================
    // org.freedesktop.DBus.Properties - producer
    //==============================================================================================================
    var org_freedesktop_dbus_properties = (function () {
        function org_freedesktop_dbus_properties() {
        }
        org_freedesktop_dbus_properties._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_freedesktop_dbus_properties.__process__Get = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var s2 = msg.body_Read_S();
            var ret = this.handle__Get(connection, s1, s2);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();
            if (typeof (ret) == "string") {
                msg.m_Reply.body_Write_V(ret, "s");
            }
            else if (typeof (ret) == "number") {
                // XXX - why q??
                msg.m_Reply.body_Write_V(ret, "q");
            }
            return true;
        };
        org_freedesktop_dbus_properties.__process__Set = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var s2 = msg.body_Read_S();
            var v1 = null; //msg.body_ReadVariant(); // XXX - fix this
            this.handle__Set(connection, s1, s2, v1);
            msg.CreateReply();
            msg.m_Reply.body_StartWriting();
            return true;
        };
        org_freedesktop_dbus_properties.__process__GetAll = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var ret = this.handle__GetAll(connection, s1);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_freedesktop_dbus_properties.handle__Get = function (connection, s1, s2) {
            var application = connection.GetApplication();
            if (s1 == "org.alljoyn.Icon") {
                if (s2 == "Version") {
                    return application.GetIconVersion();
                }
                else if (s2 == "MimeType") {
                    return application.GetIconMimeType();
                }
            }
            return 0;
        };
        org_freedesktop_dbus_properties.handle__Set = function (connection, s1, s2, v1) {
        };
        org_freedesktop_dbus_properties.handle__GetAll = function (connection, s1) {
            return 0;
        };
        return org_freedesktop_dbus_properties;
    }());
    //==============================================================================================================
    // org.freedesktop.DBus.Introspectable - producer
    //==============================================================================================================
    var org_freedesktop_dbus_introspectable = (function () {
        function org_freedesktop_dbus_introspectable() {
        }
        org_freedesktop_dbus_introspectable._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "Introspect") {
                return this.__process__Introspect(connection, msg);
            }
            return false;
        };
        org_freedesktop_dbus_introspectable.__process__Introspect = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__Introspect(connection, msg.hdr_GetObjectPath());
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_freedesktop_dbus_introspectable.handle__Introspect = function (connection, op) {
            var ret = "";
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
                ret = connection.GetApplication().GetIntrospectionXml();
            }
            return ret;
        };
        return org_freedesktop_dbus_introspectable;
    }());
    //==============================================================================================================
    // org.allseen.Introspectable - producer
    //==============================================================================================================
    var org_allseen_introspectable = (function () {
        function org_allseen_introspectable() {
        }
        org_allseen_introspectable._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "GetDescriptionLanguages") {
                return this.__process__GetDescriptionLanguages(connection, msg);
            }
            else if (member == "IntrospectWithDescription") {
                return this.__process__IntrospectWithDescription(connection, msg);
            }
            return false;
        };
        org_allseen_introspectable.__process__GetDescriptionLanguages = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetDescriptionLanguages(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("as");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AS(ret);
            return true;
        };
        org_allseen_introspectable.__process__IntrospectWithDescription = function (connection, msg) {
            msg.body_StartReading();
            var languageTag = msg.body_ReadString();
            var ret = this.handle__IntrospectWithDescription(connection, msg.hdr_GetObjectPath(), languageTag);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_allseen_introspectable.handle__GetDescriptionLanguages = function (connection) {
            return ["en"];
        };
        org_allseen_introspectable.handle__IntrospectWithDescription = function (connection, op, languageTag) {
            // ignore language tag
            return org_freedesktop_dbus_introspectable.handle__Introspect(connection, op);
        };
        return org_allseen_introspectable;
    }());
    ;
    //==============================================================================================================
    // org.freedesktop.DBus.Peer - producer
    //==============================================================================================================
    var org_freedesktop_dbus_peer = (function () {
        function org_freedesktop_dbus_peer() {
        }
        org_freedesktop_dbus_peer._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "Ping") {
                return this.__process__Ping(connection, msg);
            }
            else if (member == "GetMachineId") {
                return this.__process__GetMachineId(connection, msg);
            }
            return false;
        };
        org_freedesktop_dbus_peer.__process__Ping = function (connection, msg) {
            msg.body_StartReading();
            this.handle__Ping(connection);
            msg.CreateReply();
            msg.m_Reply.body_StartWriting();
            return true;
        };
        org_freedesktop_dbus_peer.__process__GetMachineId = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetMachineId(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_freedesktop_dbus_peer.handle__Ping = function (connection) {
        };
        org_freedesktop_dbus_peer.handle__GetMachineId = function (connection) {
            return "default-string";
        };
        return org_freedesktop_dbus_peer;
    }());
    //==============================================================================================================
    // org.freedesktop.DBus - consumer
    //==============================================================================================================
    var org_freedesktop_dbus = (function () {
        function org_freedesktop_dbus() {
        }
        org_freedesktop_dbus._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_freedesktop_dbus.__process__NameOwnerChanged = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var s2 = msg.body_Read_S();
            var s3 = msg.body_Read_S();
            this.handle__NameOwnerChanged(connection, s1, s2, s3);
            return true;
        };
        org_freedesktop_dbus.__process__NameLost = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            this.handle__NameLost(connection, s1);
            return true;
        };
        org_freedesktop_dbus.__process__NameAcquired = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            this.handle__NameAcquired(connection, s1);
            return true;
        };
        org_freedesktop_dbus.method__RequestName = function (connection, s1, u1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RequestName");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_U(u1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var u2 = msg.body_Read_U();
                if (null != cb)
                    cb(connection, u2);
            });
        };
        ;
        org_freedesktop_dbus.method__ReleaseName = function (connection, s1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("ReleaseName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var u1 = msg.body_Read_U();
                if (null != cb)
                    cb(connection, u1);
            });
        };
        ;
        org_freedesktop_dbus.method__Hello = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("Hello");
            msg.SetFlags(6);
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var s1 = msg.body_Read_S();
                if (null != cb)
                    cb(connection, s1);
            });
        };
        ;
        org_freedesktop_dbus.method__NameHasOwner = function (connection, s1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameHasOwner");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var b1 = msg.body_Read_B();
                if (null != cb)
                    cb(connection, b1);
            });
        };
        ;
        org_freedesktop_dbus.method__AddMatch = function (connection, iface, member, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("AddMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S("type='signal',interface='" + iface + "',member='" + member + "'");
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                if (null != cb)
                    cb(connection);
            });
        };
        ;
        org_freedesktop_dbus.method__RemoveMatch = function (connection, s1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RemoveMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                if (null != cb)
                    cb(connection);
            });
        };
        ;
        org_freedesktop_dbus.signal__NameOwnerChanged = function (connection, s1, s2, s3) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameOwnerChanged");
            msg.hdr_SetSignature("sss");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_S(s2);
            msg.body_Write_S(s3);
            connection.SendMsg(msg);
        };
        ;
        org_freedesktop_dbus.signal__NameLost = function (connection, s1) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameLost");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };
        ;
        org_freedesktop_dbus.signal__NameAcquired = function (connection, s1) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameAcquired");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };
        ;
        org_freedesktop_dbus.handle__NameOwnerChanged = function (connection, s1, s2, s3) {
        };
        ;
        org_freedesktop_dbus.handle__NameLost = function (connection, s1) {
        };
        ;
        org_freedesktop_dbus.handle__NameAcquired = function (connection, s1) {
        };
        ;
        return org_freedesktop_dbus;
    }());
    ;
    //==============================================================================================================
    // org.alljoyn.Bus - consumer
    //==============================================================================================================
    var org_alljoyn_bus = (function () {
        function org_alljoyn_bus() {
        }
        org_alljoyn_bus._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_alljoyn_bus.__process__FoundAdvertisedName = function (connection, msg) {
            msg.body_StartReading();
            var name = msg.body_Read_S();
            var transport = msg.body_Read_Q();
            var prefix = msg.body_Read_S();
            this.handle__FoundAdvertisedName(connection, name, transport, prefix);
            return true;
        };
        org_alljoyn_bus.__process__LostAdvertisedName = function (connection, msg) {
            msg.body_StartReading();
            var name = msg.body_Read_S();
            var transport = msg.body_Read_Q();
            var prefix = msg.body_Read_S();
            this.handle__LostAdvertisedName(connection, name, transport, prefix);
            return true;
        };
        org_alljoyn_bus.__process__MPSessionChanged = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var name = msg.body_Read_S();
            var isAdded = msg.body_Read_B();
            this.handle__MPSessionChanged(connection, sessionId, name, isAdded);
            return true;
        };
        org_alljoyn_bus.__process__MPSessionChangedWithReason = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var name = msg.body_Read_S();
            var isAdded = msg.body_Read_B();
            var reason = msg.body_Read_U();
            this.handle__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason);
            return true;
        };
        org_alljoyn_bus.__process__SessionLost = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            this.handle__SessionLost(connection, sessionId);
            return true;
        };
        org_alljoyn_bus.__process__SessionLostWithReason = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var reason = msg.body_Read_U();
            this.handle__SessionLostWithReason(connection, sessionId, reason);
            return true;
        };
        org_alljoyn_bus.__process__SessionLostWithReasonAndDisposition = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var reason = msg.body_Read_U();
            var disposition = msg.body_Read_U();
            this.handle__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition);
            return true;
        };
        org_alljoyn_bus.method__AdvertiseName = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__AliasUnixUser = function (connection, aliasUID, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AliasUnixUser");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(aliasUID);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__BindSessionPort = function (connection, portIn, opts, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BindSessionPort");
            msg.hdr_SetSignature("qa{sv}");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(portIn);
            // XXX - just fixed options at the moment
            //msg.body_WriteObject(opts, "a{sv}");
            var ooo = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x66, 0x00, 0x01, 0x79, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x6D, 0x75, 0x6C, 0x74, 0x69, 0x00, 0x01, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x70, 0x72, 0x6F, 0x78, 0x00, 0x01, 0x79, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x6E, 0x73, 0x00, 0x01, 0x71, 0x00, 0x00, 0x05, 0x01]);
            msg.body_Write_I(0x48);
            msg.body_WriteRaw(ooo);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var portOut = msg.body_Read_Q();
                if (null != cb)
                    cb(connection, disposition, portOut);
            });
        };
        ;
        org_alljoyn_bus.method__BusHello = function (connection, GUIDC, protoVerC, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BusHello");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(GUIDC);
            msg.body_Write_U(protoVerC);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var GUIDS = msg.body_Read_S();
                var uniqueName = msg.body_Read_S();
                var protoVerS = msg.body_Read_U();
                if (null != cb)
                    cb(connection, GUIDS, uniqueName, protoVerS);
            });
        };
        ;
        org_alljoyn_bus.method__CancelAdvertiseName = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelAdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelFindAdvertisedName = function (connection, name, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelFindAdvertisedNameByTransport = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelFindAdvertisementByTransport = function (connection, matching, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelSessionlessMessage = function (connection, serialNum, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelSessionlessMessage");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(serialNum);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__FindAdvertisedName = function (connection, name, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__FindAdvertisedNameByTransport = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__FindAdvertisementByTransport = function (connection, matching, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.signal__FoundAdvertisedName = function (connection, name, transport, prefix) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FoundAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.method__GetHostInfo = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("GetHostInfo");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var localipaddr = msg.body_Read_S();
                var remoteipaddr = msg.body_Read_S();
                if (null != cb)
                    cb(connection, disposition, localipaddr, remoteipaddr);
            });
        };
        ;
        org_alljoyn_bus.method__JoinSession = function (connection, sessionHost, port, opts, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("JoinSession");
            msg.hdr_SetSignature("sqa{sv}");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(sessionHost);
            msg.body_Write_Q(port);
            msg.body_WriteObject("a{sv}", opts);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disp = msg.body_Read_U();
                var sessionId = msg.body_Read_U();
                var opts = msg.body_ReadObject("a{sv}");
                if (null != cb)
                    cb(connection, disp, sessionId, opts);
            });
        };
        ;
        org_alljoyn_bus.method__LeaveHostedSession = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveHostedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__LeaveJoinedSession = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveJoinedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__LeaveSession = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.signal__LostAdvertisedName = function (connection, name, transport, prefix) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LostAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__MPSessionChanged = function (connection, sessionId, name, isAdded) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChanged");
            msg.hdr_SetSignature("usb");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__MPSessionChangedWithReason = function (connection, sessionId, name, isAdded, reason) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChangedWithReason");
            msg.hdr_SetSignature("usbu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.method__OnAppResume = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppResume");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__OnAppSuspend = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppSuspend");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__Ping = function (connection, name, timeout, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("Ping");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_U(timeout);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__ReloadConfig = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("ReloadConfig");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var loaded = msg.body_Read_B();
                if (null != cb)
                    cb(connection, loaded);
            });
        };
        ;
        org_alljoyn_bus.method__RemoveSessionMember = function (connection, sessionId, name, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("RemoveSessionMember");
            msg.hdr_SetSignature("us");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.signal__SessionLost = function (connection, sessionId) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLost");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__SessionLostWithReason = function (connection, sessionId, reason) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReason");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__SessionLostWithReasonAndDisposition = function (connection, sessionId, reason, disposition) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReasonAndDisposition");
            msg.hdr_SetSignature("uuu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            msg.body_Write_U(disposition);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.method__SetIdleTimeouts = function (connection, reqLinkTO, reqProbeTO, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetIdleTimeouts");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(reqLinkTO);
            msg.body_Write_U(reqProbeTO);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var actLinkTO = msg.body_Read_U();
                var actProbeTO = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition, actLinkTO, actProbeTO);
            });
        };
        ;
        org_alljoyn_bus.method__SetLinkTimeout = function (connection, sessionId, inLinkTO, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetLinkTimeout");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(inLinkTO);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var outLinkTO = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition, outLinkTO);
            });
        };
        ;
        org_alljoyn_bus.method__UnbindSessionPort = function (connection, port, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("UnbindSessionPort");
            msg.hdr_SetSignature("q");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(port);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.handle__FoundAdvertisedName = function (connection, name, transport, prefix) {
        };
        ;
        org_alljoyn_bus.handle__LostAdvertisedName = function (connection, name, transport, prefix) {
        };
        ;
        org_alljoyn_bus.handle__MPSessionChanged = function (connection, sessionId, name, isAdded) {
        };
        ;
        org_alljoyn_bus.handle__MPSessionChangedWithReason = function (connection, sessionId, name, isAdded, reason) {
        };
        ;
        org_alljoyn_bus.handle__SessionLost = function (connection, sessionId) {
        };
        ;
        org_alljoyn_bus.handle__SessionLostWithReason = function (connection, sessionId, reason) {
        };
        ;
        org_alljoyn_bus.handle__SessionLostWithReasonAndDisposition = function (connection, sessionId, reason, disposition) {
        };
        ;
        return org_alljoyn_bus;
    }());
    ;
    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Session - producer
    //==============================================================================================================
    var org_alljoyn_bus_peer_session = (function () {
        function org_alljoyn_bus_peer_session() {
        }
        org_alljoyn_bus_peer_session._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "AcceptSession") {
                return this.__process__AcceptSession(connection, msg);
            }
            else if (member == "SessionJoined") {
                return this.__process__SessionJoined(connection, msg);
            }
            return false;
        };
        org_alljoyn_bus_peer_session.__process__AcceptSession = function (connection, msg) {
            msg.body_StartReading();
            var port = msg.body_Read_Q();
            var id = msg.body_Read_U();
            var src = msg.body_Read_S();
            var opts = msg.body_ReadObject("a{sv}");
            var ret = this.handle__AcceptSession(connection, port, id, src, opts);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("b");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_B(ret);
            return true;
        };
        org_alljoyn_bus_peer_session.__process__SessionJoined = function (connection, msg) {
            msg.body_StartReading();
            var port = msg.body_Read_Q();
            var id = msg.body_Read_U();
            var src = msg.body_Read_S();
            this.handle__SessionJoined(connection, port, id, src);
            return true;
        };
        org_alljoyn_bus_peer_session.handle__AcceptSession = function (connection, port, id, src, opts) {
            return true;
        };
        org_alljoyn_bus_peer_session.handle__SessionJoined = function (connection, port, id, src) {
        };
        return org_alljoyn_bus_peer_session;
    }());
    ;
    //==============================================================================================================
    // org.alljoyn.Daemon - producer
    //==============================================================================================================
    var org_alljoyn_daemon = (function () {
        function org_alljoyn_daemon() {
        }
        org_alljoyn_daemon._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "ProbeAck") {
                return this.__process__ProbeAck(connection, msg);
            }
            else if (member == "ProbeReq") {
                return this.__process__ProbeReq(connection, msg);
            }
            return false;
        };
        org_alljoyn_daemon.__process__ProbeAck = function (connection, msg) {
            msg.body_StartReading();
            this.handle__ProbeAck(connection);
            return true;
        };
        org_alljoyn_daemon.__process__ProbeReq = function (connection, msg) {
            msg.body_StartReading();
            this.handle__ProbeReq(connection);
            return true;
        };
        org_alljoyn_daemon.signal__ProbeAck = function (connection) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeAck");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        };
        org_alljoyn_daemon.signal__ProbeReq = function (connection) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeReq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        };
        org_alljoyn_daemon.handle__ProbeAck = function (connection) {
        };
        org_alljoyn_daemon.handle__ProbeReq = function (connection) {
        };
        return org_alljoyn_daemon;
    }());
    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Authentication - producer
    //==============================================================================================================
    var org_alljoyn_bus_peer_authentication = (function () {
        function org_alljoyn_bus_peer_authentication() {
        }
        org_alljoyn_bus_peer_authentication._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_alljoyn_bus_peer_authentication.__process__AuthChallenge = function (connection, msg) {
            msg.body_StartReading();
            var challenge = msg.body_Read_S();
            var ret = this.handle__AuthChallenge(connection, challenge);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__ExchangeGroupKeys = function (connection, msg) {
            msg.body_StartReading();
            var localKeyMatter = msg.body_Read_AY();
            var ret = this.handle__ExchangeGroupKeys(connection, localKeyMatter);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__ExchangeGuids = function (connection, msg) {
            msg.body_StartReading();
            var localGuid = msg.body_Read_S();
            var localVersion = msg.body_Read_U();
            var ret = this.handle__ExchangeGuids(connection, localGuid, localVersion);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__ExchangeSuites = function (connection, msg) {
            msg.body_StartReading();
            var localAuthList = msg.body_Read_AU();
            var ret = this.handle__ExchangeSuites(connection, localAuthList);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("au");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AU(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__GenSessionKey = function (connection, msg) {
            msg.body_StartReading();
            var localGuid = msg.body_Read_S();
            var remoteGuid = msg.body_Read_S();
            var localNonce = msg.body_Read_S();
            var ret = this.handle__GenSessionKey(connection, localGuid, remoteGuid, localNonce);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__KeyAuthentication = function (connection, msg) {
            msg.body_StartReading();
            var localVerifier = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret = this.handle__KeyAuthentication(connection, localVerifier);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteVariant(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__KeyExchange = function (connection, msg) {
            msg.body_StartReading();
            var localAuthMask = msg.body_Read_U();
            var localPublicKey = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret = this.handle__KeyExchange(connection, localAuthMask, localPublicKey);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("u");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_U(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__SendManifest = function (connection, msg) {
            msg.body_StartReading();
            var manifest = msg.body_ReadObject("a(ssa(syy))");
            var ret = this.handle__SendManifest(connection, manifest);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(ssa(syy))");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__SendMemberships = function (connection, msg) {
            msg.body_StartReading();
            var sendCode = msg.body_Read_Y();
            var memberships = msg.body_ReadObject("a(yay)");
            var ret = this.handle__SendMemberships(connection, sendCode, memberships);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("y");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_Y(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.handle__AuthChallenge = function (connection, challenge) {
            return "default-string";
        };
        org_alljoyn_bus_peer_authentication.handle__ExchangeGroupKeys = function (connection, localKeyMatter) {
            return null; //[1, 2, 3];
        };
        org_alljoyn_bus_peer_authentication.handle__ExchangeGuids = function (connection, localGuid, localVersion) {
            return "default-string";
        };
        org_alljoyn_bus_peer_authentication.handle__ExchangeSuites = function (connection, localAuthList) {
            return null; //[1, 2, 3];
        };
        org_alljoyn_bus_peer_authentication.handle__GenSessionKey = function (connection, localGuid, remoteGuid, localNonce) {
            return "default-string";
        };
        org_alljoyn_bus_peer_authentication.handle__KeyAuthentication = function (connection, localVerifier) {
            return 0;
        };
        org_alljoyn_bus_peer_authentication.handle__KeyExchange = function (connection, localAuthMask, localPublicKey) {
            return 0;
        };
        org_alljoyn_bus_peer_authentication.handle__SendManifest = function (connection, manifest) {
            return 0;
        };
        org_alljoyn_bus_peer_authentication.handle__SendMemberships = function (connection, sendCode, memberships) {
            return 0;
        };
        return org_alljoyn_bus_peer_authentication;
    }());
    //==============================================================================================================
    // WEB SOCKET SPECIFIC CODE BELOW
    //==============================================================================================================
    var ConnectorWebSocket = (function (_super) {
        __extends(ConnectorWebSocket, _super);
        function ConnectorWebSocket() {
            _super.apply(this, arguments);
        }
        ConnectorWebSocket.prototype.ConnectTransport = function () {
            var _this_ = this;
            this.m_socket = new WebSocket("ws://localhost:8088/", "binary");
            this.m_socket.binaryType = "arraybuffer";
            this.m_socket.onopen = function (event) {
                _this_.OnTransportConnected(true);
            };
            this.m_socket.onmessage = function (e) {
                _this_.OnDataReceived(new Uint8Array(e.data));
            };
            this.m_socket.onerror = function (e) {
                _this_.OnTransportConnected(false);
            };
        };
        ConnectorWebSocket.prototype.DisconnectTransport = function () {
            if (this.m_socket != null) {
                this.m_socket.close();
                this.m_socket = null;
            }
        };
        ConnectorWebSocket.prototype.WriteData = function (data) {
            this.m_socket.send(data);
        };
        ConnectorWebSocket.prototype.OnSendSuccess = function () {
            console.log("SEND SUCCESS");
        };
        ConnectorWebSocket.prototype.OnSendFailed = function () {
            console.log("SEND FAILED");
        };
        ConnectorWebSocket.prototype.ReadData = function () {
            // nothing to do in this implementation
        };
        return ConnectorWebSocket;
    }(ConnectorBase));
    AJ.ConnectorWebSocket = ConnectorWebSocket;
    //==============================================================================================================
    // GENERATED CODE BELOW
    //==============================================================================================================
    var Application = (function (_super) {
        __extends(Application, _super);
        function Application() {
            _super.apply(this, arguments);
        }
        Application.prototype._ProcessMsg = function (connection, msg) { };
        Application.prototype.GetId = function () { return null; };
        Application.prototype.GetName = function () { return ""; };
        Application.prototype.GetDeviceId = function () { return ""; };
        Application.prototype.GetDeviceName = function () { return ""; };
        Application.prototype.GetManufacturer = function () { return ""; };
        Application.prototype.GetModelNumber = function () { return ""; };
        Application.prototype.GetDescription = function () { return ""; };
        Application.prototype.GetIcon = function () { return null; };
        Application.prototype.GetIconUrl = function () { return ""; };
        Application.prototype.GetIconVersion = function () { return 1; };
        Application.prototype.GetIconMimeType = function () { return ""; };
        Application.prototype.GetIntrospectionXml = function () { return ""; };
        return Application;
    }(ApplicationBase));
    AJ.Application = Application;
    ;
})(AJ || (AJ = {}));
//# sourceMappingURL=generated.js.map