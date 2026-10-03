"""Per-size copy for the image-compressor size pages.

One entry per size, keyed by its canonical token ("20kb", "1mb"). `build_tools.py`
merges these into the SIZES list, so adding a size is one row here plus one row there.
Everything a page says about ITS size lives in this file: find-and-replace on the digit
is exactly what these pages must not be, so the text has to be written per size.

Fields: note (the one-line differentiator under the headline), lede (intro paragraph),
what (2 paragraphs on what that size really means), when (4 situations that need it),
quality (the honest expectation at that size), wave (build order from the research doc).
"""

SIZE_COPY = {
    "20kb": {
        "note": 'the tightest limit you will normally meet',
        "lede": '20 KB is the smallest size most upload forms accept. This page compresses an image to 20 KB or less, in your browser, with no signup and no daily limit.',
        "what": [
            'At 20 KB a photograph is genuinely squeezed. A phone photo straight off the camera is typically 2–6 MB, so reaching 20 KB usually means both lowering the JPEG quality and reducing the pixel dimensions. That is normal and it is what the form is asking for.',
            'The exception is a signature or a simple logo on a plain background. Those are mostly flat colour, compress extremely well, and can often stay at full size and still land under 20 KB with no visible loss at all.',
        ],
        "when": [
            'Photo and signature fields on online application forms that cap uploads at 20 KB',
            'Thumbnails and avatars where the image is displayed small anyway',
            'Email attachments on a restricted or metered connection',
            'Anywhere a form rejects your file with “file too large” and 20 KB is the stated limit',
        ],
        "quality": 'Expect visible softness at 20 KB if the source is a full-size photograph — that is the honest trade at this size, not a fault in the tool. Check the preview before you submit, and if the form accepts a larger file, 50 KB will look noticeably better for the same effort.',
        "wave": 1,
    },
    "25kb": {
        "note": '20 KB with a little breathing room',
        "lede": 'Compress an image to 25 KB or less, right in your browser. No account, no upload, no limit on how many files you do.',
        "what": [
            '25 KB sits just above the 20 KB ceiling, and that extra 5 KB buys a surprising amount of visible quality because JPEG compression gets much more efficient once it has a little room to work with.',
            'If a form says 20 KB, compress to 25 KB and you will usually still be accepted — but if it is strict, use the 20 KB page. Check the exact limit on the form before choosing.',
        ],
        "when": [
            'Forms that state a limit like “under 25 KB” or “maximum 25 KB”',
            'Signature and stamp uploads that need a little more detail than 20 KB allows',
            'Profile pictures shown at small sizes where 20 KB looked slightly soft',
            'Any place you want the smallest file that still reads clearly',
        ],
        "quality": 'Slightly better than 20 KB and usually indistinguishable from it on screen at thumbnail size. For a full-size photograph it will still look soft — that is the 25 KB budget, not the tool.',
        "wave": 1,
    },
    "30kb": {
        "note": 'a common exam and registration limit',
        "lede": 'Compress an image to 30 KB or less in your browser — free, unlimited, and nothing is uploaded to a server.',
        "what": [
            '30 KB is a very common ceiling for exam registrations, job portals and government forms that want a small photograph but still need the face to be recognisable.',
            'At this size a head-and-shoulders photo is still clearly identifiable. Fine detail such as hair texture or a busy background will soften first — which is another reason a plain background is worth having.',
        ],
        "when": [
            'Exam and registration forms with a 30 KB photo limit',
            'Online job applications and portal profile photos',
            'ID-style photos where the face must stay recognisable',
            'Documents that must stay small enough to email',
        ],
        "quality": 'A reasonable balance for portraits. Faces stay clear; fine texture softens. If the result still looks too soft, the source image is probably very large — crop closer to the subject first, then compress.',
        "wave": 1,
    },
    "50kb": {
        "note": 'the most common photo-upload limit',
        "lede": 'Compress an image to 50 KB or less, free and unlimited, entirely on your own device. No signup, no queue, no upload.',
        "what": [
            '50 KB is the single most common photograph limit on the web. Many forms, portals and profile systems settle here because it is small enough to store millions of images cheaply and large enough that a face still looks like a face.',
            'For a typical phone photo, 50 KB usually means keeping the full resolution and lowering the JPEG quality. The result is normally fine for anything displayed on a screen at less than full size.',
        ],
        "when": [
            'Photo upload fields with a 50 KB cap',
            'Passport-style and ID photos for online submissions',
            'Profile pictures and staff directories',
            'Web images where you want a small file but still good clarity',
        ],
        "quality": 'Good. At 50 KB most photographs still look clean on a phone or laptop screen. You will notice the difference only if you zoom in or print.',
        "wave": 1,
    },
    "100kb": {
        "note": 'a comfortable size for documents and web images',
        "lede": 'Compress any image to 100 KB or less in your browser. Free, no limits, no account, and your files never leave your device.',
        "what": [
            '100 KB is roomy for a photograph and very comfortable for a scanned document, a screenshot or a signature. At this size JPEG barely has to try, so the result usually looks the same as the original.',
            'It is also the point where PNG becomes realistic for graphics and logos with flat colour, because a palette-reduced PNG at 100 KB is still sharp. Photographs should stay in JPG or WebP.',
        ],
        "when": [
            'Document scans and screenshots that must stay legible',
            'Web pages and emails where you want quality without bloat',
            'Logos and flat-colour graphics (use PNG output for these)',
            'Any upload form with a 100 KB limit',
        ],
        "quality": 'Very good for photographs and effectively lossless-looking for graphics and scans. If a photo comes back soft at 100 KB, the source was unusually large — resize it closer to its display size first.',
        "wave": 1,
    },
    "200kb": {
        "note": 'good quality, still small',
        "lede": 'Compress images to 200 KB or less, in bulk, in your browser. No signup, no upload, no limit on file count.',
        "what": [
            '200 KB is a good working size for web images, catalogue photos and document scans. Quality loss is generally invisible on screen, and the file is still small enough to attach or upload without trouble.',
            'At this size the tool rarely needs to reduce dimensions, so you keep the full pixel size of the original — only the encoder quality comes down.',
        ],
        "when": [
            'E-commerce and catalogue product photos',
            'Website images where you want near-original clarity',
            'Scanned documents that must stay sharp when zoomed',
            'Batch work: many images, one target size, no per-file limit',
        ],
        "quality": 'Near-original on screen. This is the size to choose when you want compression without thinking about it.',
        "wave": 1,
    },
    "500kb": {
        "note": 'high quality with a small saving',
        "lede": 'Compress images to 500 KB or less in your browser — no signup, no limits, nothing uploaded to any server.',
        "what": [
            'At 500 KB you are mostly trimming rather than squeezing. A large photo straight from a modern phone can be 4 MB or more, and 500 KB keeps it looking excellent while cutting it down to a fraction of the size.',
            'If your image is already under 500 KB, the tool leaves it untouched rather than re-encoding it and losing quality for no reason.',
        ],
        "when": [
            'Portfolio and gallery images that must still look sharp',
            'Product photography for listings',
            'Print-at-home photos where you want to keep detail',
            'Preparing a set of images for a site where 200 KB looked slightly flat',
        ],
        "quality": 'Excellent. At 500 KB the difference from the original is very hard to see even side by side.',
        "wave": 1,
    },

    "40kb": {
        "note": "just clear of the size where faces start to smear",
        "lede": "Compress an image to 40 KB or less in your browser — free, unlimited, and your "
                "file never leaves your device.",
        "what": [
            "40 KB is roughly the floor for a picture of a person. A face is made of large, "
            "smooth areas of similar colour, and JPEG handles those well down to about this size. "
            "Below it the cheeks and forehead start to look waxy and the edge of the hair turns "
            "into a smear.",
            "Two things decide whether 40 KB works for your picture. A plain background or a "
            "close head-and-shoulders crop will usually reach it at full pixel size, while a busy "
            "background or a full-body shot also needs its dimensions reduced.",
        ],
        "when": [
            "An ID or profile photo field with a 40 KB limit",
            "A form that rejects anything above 40 KB, with no option to upload larger",
            "Attaching a picture to an application that caps the whole submission",
            "An avatar or thumbnail that is only ever displayed small",
        ],
        "quality": "Recognisable and clean at display size, with fine texture — hair, fabric "
                   "patterns — softening first. If it looks soft, crop closer to the subject and "
                   "compress again rather than cutting the size further.",
        "wave": 1,
    },
    "70kb": {
        "note": "a small margin under a 75 KB limit",
        "lede": "Compress an image to 70 KB or less, right in your browser. No account, no upload, "
                "no limit on how many images you do.",
        "what": [
            "70 KB is the size you pick when the real limit is 75 or 80 KB. Aiming a few "
            "kilobytes below the ceiling matters more than it sounds: some forms re-save your "
            "upload, some count the file name and the request headers, and the file that lands "
            "exactly on the maximum is the one that comes back rejected.",
            "For a photograph, 70 KB is still enough to keep the full pixel dimensions in most "
            "cases, so you are trading a little fine detail rather than the size of the picture.",
        ],
        "when": [
            "A form that states a limit of 75 KB or 80 KB and you want margin",
            "Portals that reject files sitting exactly on the stated maximum",
            "Several images in one submission, where the total is capped as well",
            "Anywhere you would rather be safely inside the limit than exactly on it",
        ],
        "quality": "Very close to an 80 KB result on screen; the difference shows in fine texture, "
                   "not in faces. If you have room to the limit, take it — 90 KB or 100 KB looks "
                   "slightly better for very little extra size.",
        "wave": 1,
    },
    "80kb": {
        "note": "where skin tones stop banding",
        "lede": "Compress an image to 80 KB or less in your browser — free, unlimited, nothing "
                "uploaded to a server.",
        "what": [
            "80 KB is usually where a portrait stops showing banding in the skin. Smooth "
            "gradients are the first thing heavy JPEG compression damages: cheeks, foreheads and "
            "studio backdrops turn into visible steps of colour, and at 50 KB that is a real risk "
            "on a large face.",
            "Eighty kilobytes gives those gradients enough room to stay smooth while still being "
            "a small file — well under a fifth of a megabyte, fine for email and trivial for a "
            "form to store.",
        ],
        "when": [
            "A photo field with an 80 KB limit",
            "Portraits and family pictures where smooth skin tones matter",
            "Forms that ask for a clear photograph rather than a thumbnail",
            "Email attachments that should look good without being heavy",
        ],
        "quality": "Faces stay smooth and natural, which is the main reason to choose 80 KB over "
                   "50 KB for a portrait. Backgrounds with fine detail — leaves, crowds, gravel — "
                   "will still soften.",
        "wave": 1,
    },
    "90kb": {
        "note": "under either meaning of a 100 KB limit",
        "lede": "Compress an image to 90 KB or less, free and unlimited, entirely on your own "
                "device. No signup and no upload.",
        "what": [
            "90 KB is the safe way to satisfy a 100 KB limit. A limit expressed in kilobytes is "
            "ambiguous: some systems mean 100 × 1000 bytes and others mean 100 × 1024, and a file "
            "that is fine under one reading can be rejected under the other. Ninety kilobytes "
            "clears both.",
            "It also leaves room for the small differences in how browsers and servers count a "
            "file, and for forms that re-encode your upload after it arrives.",
        ],
        "when": [
            "A form or portal that states a 100 KB limit",
            "Any upload where you want to be certain you are inside the limit",
            "Batch submissions of several images with a per-file cap",
            "Passport and visa style photo fields that are strict about size",
        ],
        "quality": "For photographs this is effectively indistinguishable from the original at "
                   "normal viewing size. Choose the full 100 KB only if the site displays your "
                   "file at full width.",
        "wave": 1,
    },
    "256kb": {
        "note": "the power-of-two ceiling, with no resizing at all",
        "lede": "Compress an image to 256 KB or less in your browser. No account, no daily limit, "
                "and your images are never uploaded.",
        "what": [
            "256 KB is a quarter of a megabyte — a round number in binary, which is why upload "
            "systems built by engineers often cap there. It is small enough to store and serve "
            "cheaply, and large enough to look untouched.",
            "In practice 256 KB is the size at which you almost never lose pixels. Most phone "
            "photos reach it by lowering the JPEG quality alone, keeping the full width and "
            "height, so the picture you get back is the same size as the one you gave.",
        ],
        "when": [
            "A portal or CMS with a 256 KB per-file limit",
            "Photo libraries and galleries that cap individual files",
            "Documents with embedded photographs that must stay readable",
            "Anything where you want the compression to be invisible",
        ],
        "quality": "Very close to the original. At 256 KB the loss sits in deep texture rather "
                   "than in anything you would notice on screen, and the pixel dimensions are "
                   "normally kept.",
        "wave": 1,
    },
    "300kb": {
        "note": "small enough for a form, sharp enough to read",
        "lede": "Compress an image to 300 KB or less, free and unlimited, in your browser. "
                "Nothing is uploaded to a server.",
        "what": [
            "300 KB is the size at which scanned documents still work. Text is much harder to "
            "compress than a face: the sharp black edges of letters are exactly what a JPEG "
            "encoder wants to blur, so a page of print needs more bytes than a portrait to stay "
            "readable.",
            "If you are compressing a scan, keep the pixel dimensions and let the quality drop "
            "instead — reducing the width of a scanned page is what turns letters to mush, not "
            "the file size by itself.",
        ],
        "when": [
            "A form with a 300 KB limit for a scanned document",
            "Mark sheets, certificates and receipts that must stay legible",
            "Passport or visa applications that cap a scan at a few hundred kilobytes",
            "Photo fields on systems that ask for more than a thumbnail",
        ],
        "quality": "Print on a scan stays readable as long as you keep the dimensions. On a "
                   "photograph 300 KB is generous — expect the result to look like the original "
                   "at normal viewing size.",
        "wave": 1,
    },
    "512kb": {
        "note": "half a megabyte — the cap you meet most often",
        "lede": "Compress an image to 512 KB or less in your browser — free, unlimited, and "
                "nothing leaves your device.",
        "what": [
            "512 KB is half a megabyte, and it is one of the most widely used per-file ceilings "
            "on the web: a round binary number, cheap to store, and comfortably larger than a "
            "full-resolution photograph. When a site gives you no obvious reason for its limit, "
            "this is often what it is.",
            "The useful property of this size is that it costs you almost nothing. A photograph "
            "at 512 KB looks the same as the original on any screen and at any print size you "
            "would make from a phone camera, so you get inside the limit without a visible trade.",
        ],
        "when": [
            "A form, portal or CMS with a 512 KB or half-megabyte limit",
            "Email attachments where the provider caps the total size",
            "Photo collections that may later be viewed full screen or printed",
            "Any upload where you would rather not choose between quality and size",
        ],
        "quality": "Effectively indistinguishable from the original. At 512 KB the encoder is "
                   "removing detail you cannot see at normal viewing size, and the full pixel "
                   "dimensions are kept.",
        "wave": 1,
    },
    "1mb": {
        "note": "full detail kept, for printing or later editing",
        "lede": "Compress an image to 1 MB or less, right in your browser. No signup, no queue, "
                "no upload — your picture stays on your device.",
        "what": [
            "1 MB is the size people ask for by name, and it is the one to pick when the picture "
            "still has a life after the upload. At a megabyte you are keeping the detail you "
            "would need to print it, to crop it, or to run it through another tool later.",
            "A photo that arrives under 1 MB is one you do not have to think about again: it "
            "passes almost every mail attachment limit, sits comfortably in any gallery, and "
            "still looks like a photograph rather than a thumbnail.",
        ],
        "when": [
            "A form or platform with a 1 MB per-image limit",
            "Photos you may print or edit later and do not want to degrade now",
            "Email attachments, where 1 MB is the practical ceiling for several images",
            "Marketplace and property listings that want a large, detailed picture",
        ],
        "quality": "The result normally keeps the full pixel dimensions and looks like the "
                   "original. If your file is already close to 1 MB there is very little to do — "
                   "you will see the metadata removed and little else.",
        "wave": 1,
    },
    "2mb": {
        "note": "strip the metadata, keep the picture",
        "lede": "Compress an image to 2 MB or less, free and unlimited, entirely in your browser. "
                "Nothing is uploaded.",
        "what": [
            "2 MB is where compression stops being about looks and starts being about "
            "housekeeping. A modern phone writes a good deal into the file that has nothing to do "
            "with the picture — camera model, lens, GPS position, embedded thumbnails — and that "
            "is often a few hundred kilobytes of the total.",
            "So on a large photo, reaching 2 MB usually means re-encoding at a high quality and "
            "dropping that extra data. What changes is the file, not the picture.",
        ],
        "when": [
            "Chat apps and social platforms with a 2 MB photo limit",
            "Classifieds, marketplace and property listings",
            "Sharing a photo that should still look sharp when opened",
            "Anywhere the platform will compress your upload again anyway",
        ],
        "quality": "Visually the same as the original in almost every case. The saving here is "
                   "metadata and a high-quality re-encode, not a reduction in what you can see.",
        "wave": 1,
    },
    "5mb": {
        "note": "for a 6–8 MB photo that has to fit a ceiling",
        "lede": "Compress an image to 5 MB or less in your browser — free, unlimited, and your "
                "file never leaves your device.",
        "what": [
            "5 MB is a ceiling, not a target: at this size you are not trying to make a small "
            "file, you are trying to make a large one fit. That is the situation with a modern "
            "phone photo of 6 to 9 MB and a platform that will not accept more than five.",
            "Because the budget is generous the tool stays on the safest path — a high-quality "
            "re-encode at full pixel dimensions, with the camera's metadata removed. If your file "
            "already fits, it will tell you so rather than shrink it for the sake of shrinking.",
        ],
        "when": [
            "A platform with a 5 MB per-file limit and a photo straight off your phone",
            "Print services and editors that ask for a large but bounded file",
            "Scans and photographs that must keep their full resolution",
            "Anywhere 10 MB is too many bytes but 5 MB is fine",
        ],
        "quality": "Very high. At this size the compression is barely visible because the budget "
                   "is so generous — you are mainly removing metadata and re-encoding once at a "
                   "high quality.",
        "wave": 1,
    },
}
