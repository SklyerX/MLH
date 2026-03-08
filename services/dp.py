# Reference: https://www.cs.toronto.edu/~brudno/csc2427/Lec7Notes.pdf

def del_cost(n):
    return (-2 * n)


def match_cost(a, b):
    if a == b:
        return 2
    else:
        return -3

# j = seq2 = y-axis; i = seq1 = x-axis


def seq_align(seq1, seq2):
    alignMatrix = [([0] * (len(seq1)+1)) for j in range(0, len(seq2)+1)]
    lenSeq1 = len(seq1)
    lenSeq2 = len(seq2)

    for i in range(0, len(seq1)+1):
        for j in range(0, len(seq2)+1):
            if i == 0 and j == 0:
                alignMatrix[j][i] = 0
            elif i > 0 and j == 0:
                alignMatrix[j][i] = del_cost(i)
            elif i == 0 and j > 0:
                alignMatrix[j][i] = del_cost(j)
            else:
                alignMatrix[j][i] = max(
                    # means gap in the y-axis (sequence 2)
                    alignMatrix[j][i-1] + del_cost(1),
                    # means gap in the x-axis (sequence 1)
                    alignMatrix[j-1][i] + del_cost(1),
                    alignMatrix[j-1][i-1] + match_cost(seq1[i-1], seq2[j-1])
                )
    # print("\n------NEEDLEMAN-MUNSCH MATRIX------")
    # for row in range(0, len(alignMatrix)):
    #     print(alignMatrix[row])

    seq1Alignment = ""
    alignMatches = ""
    seq2Alignment = ""

    i = lenSeq1
    j = lenSeq2
    while i != 0 and j != 0:
        if alignMatrix[j][i] == alignMatrix[j][i-1] + del_cost(1):
            # Means gap in y-axis
            seq1Alignment += seq1[i-1]
            alignMatches += " "
            seq2Alignment += "-"
            i -= 1
        elif alignMatrix[j][i] == alignMatrix[j-1][i] + del_cost(1):
            # Means gap in x-axis
            seq1Alignment += "-"
            alignMatches += " "
            seq2Alignment += seq2[j-1]
            j -= 1
        else:
            seq1Alignment += seq1[i-1]
            if seq1[i-1] == seq2[j-1]:
                alignMatches += "|"
            else:
                alignMatches += " "
            seq2Alignment += seq2[j-1]
            j -= 1
            i -= 1

    seq1Alignment = seq1Alignment[::-1]
    alignMatches = alignMatches[::-1]
    seq2Alignment = seq2Alignment[::-1]

    print("--------------RESULTS--------------")
    print(seq1Alignment)
    print(alignMatches)
    print(seq2Alignment)
    print(f"Alignment Score: {alignMatrix[lenSeq2][lenSeq1]}")
    return alignMatrix[lenSeq2][lenSeq1]

# if __name__ == "__main__":
#     # seq1 = "ACTGATTCA"
#     seq1 = input("\n Enter your first DNA sequence: ")
#     lenSeq1 = len(seq1)
#     # seq2 = "ACGCATCA"
#     seq2 = input("\n Enter your second DNA sequence: ")
#     lenSeq2 = len(seq2)
#     seq_align(seq1, seq2)

    # print("Best Possible Alignment Score: " + str((max(lenSeq1,lenSeq2) * 2) - del_cost(abs(lenSeq1-lenSeq2))))
